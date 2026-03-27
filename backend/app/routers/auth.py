import logging
import secrets
import time
from collections import defaultdict
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserRegister, UserLogin, UserResponse, Token, PasswordChange, ForgotPasswordRequest, ResetPasswordRequest
from app.auth.jwt import hash_password, verify_password, create_access_token, decode_access_token_for_refresh
from app.auth.dependencies import get_current_user
from app.config import settings

_logger = logging.getLogger(__name__)

# Dummy hash for constant-time login (prevents timing-based username enumeration)
_DUMMY_HASH = hash_password("dummy-constant-password")

router = APIRouter()

# Rate limiter config
_RATE_LIMIT_WINDOW = 60  # seconds

# In-memory fallback rate limiter
_rate_limit_attempts: dict[str, list[float]] = defaultdict(list)
_last_sweep: float = 0.0
_SWEEP_INTERVAL = 60.0  # seconds between cleanup sweeps

# Try to use Redis for rate limiting (works across workers)
_redis_client = None


def _get_redis():
    global _redis_client
    if _redis_client is None:
        try:
            import redis
            _redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
            _redis_client.ping()
        except Exception:
            _redis_client = False  # Mark as unavailable
            _logger.info("Redis unavailable for rate limiting, using in-memory fallback")
    return _redis_client if _redis_client is not False else None


def _clear_rate_limits():
    """Clear all rate limit state (for testing)."""
    _rate_limit_attempts.clear()
    r = _get_redis()
    if r:
        try:
            for key in r.scan_iter("rate_limit:*"):
                r.delete(key)
        except Exception:
            pass


def _check_rate_limit(request: Request, prefix: str, max_attempts: int, detail: str) -> None:
    ip = request.client.host if request.client else "unknown"
    r = _get_redis()

    if r:
        key = f"rate_limit:{prefix}:{ip}"
        try:
            current = r.incr(key)
            if current == 1:
                r.expire(key, _RATE_LIMIT_WINDOW)
            if current > max_attempts:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=detail,
                )
            return
        except HTTPException:
            raise
        except Exception:
            pass  # Fall through to in-memory

    # In-memory fallback
    mem_key = f"{prefix}:{ip}"
    now = time.monotonic()
    attempts = _rate_limit_attempts[mem_key]
    cleaned = [t for t in attempts if now - t < _RATE_LIMIT_WINDOW]
    if not cleaned:
        # Remove empty keys to prevent unbounded dict growth
        _rate_limit_attempts.pop(mem_key, None)
        cleaned = []
    else:
        _rate_limit_attempts[mem_key] = cleaned
    if len(cleaned) >= max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
        )
    _rate_limit_attempts[mem_key].append(now)

    # Periodic TTL-based sweep instead of nuclear clear
    global _last_sweep
    if now - _last_sweep > _SWEEP_INTERVAL:
        _last_sweep = now
        stale_keys = [k for k, v in _rate_limit_attempts.items()
                      if not v or now - v[-1] >= _RATE_LIMIT_WINDOW]
        for k in stale_keys:
            _rate_limit_attempts.pop(k, None)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, request: Request, db: Session = Depends(get_db)):
    """Register a new user account."""
    _check_rate_limit(request, "register", 5, "Too many registration attempts. Please try again later.")
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Authenticate user and return a JWT access token."""
    _check_rate_limit(request, "login", 10, "Too many login attempts. Please try again later.")
    user = db.query(User).filter(User.email == payload.email).first()
    # Always run verify_password to prevent timing-based username enumeration
    password_valid = verify_password(
        payload.password,
        user.hashed_password if user else _DUMMY_HASH,
    )
    if not user or not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=access_token)


@router.post("/refresh", response_model=Token)
def refresh_token(request: Request, db: Session = Depends(get_db)):
    """Refresh an access token. Accepts tokens up to 24h past expiry."""
    from fastapi.security import HTTPBearer
    auth = HTTPBearer(auto_error=False)
    # Extract token from Authorization header manually
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    token = auth_header[7:]

    payload = decode_access_token_for_refresh(token)
    if payload is None or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token cannot be refreshed")

    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or deactivated")

    new_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=new_token)


@router.put("/webhook")
def update_webhook(
    request_body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's webhook URL for alert notifications."""
    webhook_url = request_body.get("webhook_url", "").strip()
    if webhook_url and not webhook_url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Invalid URL format")
    current_user.webhook_url = webhook_url or None
    db.commit()
    return {"message": "Webhook URL updated", "webhook_url": current_user.webhook_url}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user."""
    return current_user


@router.put("/password")
def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change the current user's password."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """Request a password reset token."""
    _check_rate_limit(request, "forgot_password", 3, "Too many password reset requests. Please try again later.")
    user = db.query(User).filter(User.email == payload.email).first()

    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If an account with that email exists, a password reset token has been generated."}

    # Generate token
    token = secrets.token_urlsafe(32)
    user.password_reset_token = token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()

    _logger.info("Password reset token generated for user %s: %s", user.email, token)

    # Return token in response for dev purposes (no email service configured)
    return {
        "message": "If an account with that email exists, a password reset token has been generated.",
        "dev_token": token,
    }


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using a valid reset token."""
    user = db.query(User).filter(User.password_reset_token == payload.token).first()

    if not user or not user.reset_token_expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    # Compare in UTC — the DB column is naive DateTime, so normalize both sides
    expires = user.reset_token_expires
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        # Clear expired token
        user.password_reset_token = None
        user.reset_token_expires = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user.hashed_password = hash_password(payload.new_password)
    user.password_reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {"message": "Password has been reset successfully"}
