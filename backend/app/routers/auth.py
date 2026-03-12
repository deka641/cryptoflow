import logging
import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserRegister, UserLogin, UserResponse, Token, PasswordChange
from app.auth.jwt import hash_password, verify_password, create_access_token
from app.auth.dependencies import get_current_user
from app.config import settings

_logger = logging.getLogger(__name__)

router = APIRouter()

# Rate limiter config
_RATE_LIMIT_MAX = 10
_RATE_LIMIT_WINDOW = 60  # seconds

# In-memory fallback rate limiter
_login_attempts: dict[str, list[float]] = defaultdict(list)

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
    _login_attempts.clear()
    r = _get_redis()
    if r:
        try:
            for key in r.scan_iter("rate_limit:login:*"):
                r.delete(key)
        except Exception:
            pass


def _check_login_rate_limit(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    r = _get_redis()

    if r:
        # Redis-based rate limiting (works across multiple workers)
        key = f"rate_limit:login:{ip}"
        try:
            current = r.incr(key)
            if current == 1:
                r.expire(key, _RATE_LIMIT_WINDOW)
            if current > _RATE_LIMIT_MAX:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many login attempts. Please try again later.",
                )
            return
        except HTTPException:
            raise
        except Exception:
            pass  # Fall through to in-memory

    # In-memory fallback
    now = time.monotonic()
    attempts = _login_attempts[ip]
    _login_attempts[ip] = [t for t in attempts if now - t < _RATE_LIMIT_WINDOW]
    if len(_login_attempts[ip]) >= _RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
        )
    _login_attempts[ip].append(now)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account."""
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
    _check_login_rate_limit(request)
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
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
