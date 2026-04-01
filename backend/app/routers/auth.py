import logging
import secrets
from datetime import datetime, timezone, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserRegister, UserLogin, UserResponse, Token, PasswordChange, ForgotPasswordRequest, ResetPasswordRequest, WebhookUpdate
from app.auth.jwt import hash_password, verify_password, create_access_token, decode_access_token_for_refresh
from app.auth.dependencies import get_current_user
from app.config import settings
from app.utils.url_validation import validate_webhook_url
from app.utils.rate_limiter import check_rate_limit, clear_all as _clear_rate_limits

_logger = logging.getLogger(__name__)

# Dummy hash for constant-time login (prevents timing-based username enumeration)
_DUMMY_HASH = hash_password("dummy-constant-password")

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, request: Request, db: Session = Depends(get_db)):
    """Register a new user account."""
    check_rate_limit(request, "register", 5, detail="Too many registration attempts. Please try again later.")
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
    check_rate_limit(request, "login", 10, detail="Too many login attempts. Please try again later.")
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
    payload: WebhookUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's webhook URL for alert notifications."""
    webhook_url = payload.webhook_url.strip()
    if webhook_url:
        validate_webhook_url(webhook_url)
    current_user.webhook_url = webhook_url or None
    db.commit()
    return {"message": "Webhook URL updated", "webhook_url": current_user.webhook_url}


def _detect_webhook_platform(url: str) -> str:
    """Detect webhook platform from URL."""
    if "discord.com/api/webhooks/" in url:
        return "discord"
    if "hooks.slack.com/" in url:
        return "slack"
    return "generic"


def _build_test_webhook_payload(platform: str) -> dict:
    """Build a platform-specific test webhook payload."""
    now = datetime.now(timezone.utc).isoformat()

    if platform == "discord":
        return {
            "embeds": [{
                "title": "\U0001f514 CryptoFlow Webhook Test",
                "description": "This is a test notification from CryptoFlow price alerts. Your webhook is working correctly!",
                "color": 0x34d399,
                "fields": [
                    {"name": "Current Price", "value": "$0.00", "inline": True},
                    {"name": "Target Price", "value": "$0.00", "inline": True},
                    {"name": "Direction", "value": "Test", "inline": True},
                ],
                "footer": {"text": "CryptoFlow Alerts"},
                "timestamp": now,
            }]
        }

    if platform == "slack":
        return {
            "blocks": [
                {
                    "type": "header",
                    "text": {"type": "plain_text", "text": "\U0001f514 CryptoFlow Webhook Test"},
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "This is a test notification from CryptoFlow price alerts. Your webhook is working correctly!",
                    },
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": "*Current Price:* $0.00"},
                        {"type": "mrkdwn", "text": "*Target Price:* $0.00"},
                        {"type": "mrkdwn", "text": "*Direction:* Test"},
                    ],
                },
            ]
        }

    # Generic
    return {
        "event": "webhook_test",
        "message": "This is a test notification from CryptoFlow price alerts. Your webhook is working correctly!",
        "timestamp": now,
        "platform_hint": "generic",
    }


@router.post("/webhook/test")
async def test_webhook(
    current_user: User = Depends(get_current_user),
):
    """Send a test payload to the user's configured webhook URL."""
    if not current_user.webhook_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No webhook URL configured. Set a webhook URL first.",
        )

    webhook_url = current_user.webhook_url
    validate_webhook_url(webhook_url)

    platform = _detect_webhook_platform(webhook_url)
    payload = _build_test_webhook_payload(platform)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
        if resp.status_code >= 400:
            return {
                "message": "Webhook test failed",
                "status_code": resp.status_code,
            }
        return {
            "message": "Test webhook sent",
            "status_code": resp.status_code,
        }
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Webhook request timed out",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to send webhook: {str(e)}",
        )


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
    check_rate_limit(request, "forgot_password", 3, detail="Too many password reset requests. Please try again later.")
    user = db.query(User).filter(User.email == payload.email).first()

    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If an account with that email exists, a password reset token has been generated."}

    # Generate token
    token = secrets.token_urlsafe(32)
    user.password_reset_token = token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()

    _logger.info("Password reset token generated for user %s", user.email)

    # Return token in response only in development (no email service configured)
    response = {"message": "If an account with that email exists, a password reset token has been generated."}
    if settings.ENVIRONMENT != "production":
        response["dev_token"] = token
    return response


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
