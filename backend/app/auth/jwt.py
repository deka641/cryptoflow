from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
import bcrypt

from app.config import settings


def hash_password(password: str) -> str:
    pw_bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    pw_bytes = plain_password.encode("utf-8")[:72]
    return bcrypt.checkpw(pw_bytes, hashed_password.encode("utf-8"))


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def decode_access_token_for_refresh(token: str) -> dict | None:
    """Decode a token allowing up to 24h past expiry (for refresh purposes)."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": False},
        )
        # Check that the token was issued within the refresh window (24 hours)
        iat = payload.get("iat")
        if iat is not None:
            issued_at = datetime.fromtimestamp(iat, tz=timezone.utc)
            max_age = timedelta(hours=24)
            if datetime.now(timezone.utc) - issued_at > max_age:
                return None
        else:
            # Legacy token without iat — check exp wasn't more than 24h ago
            exp = payload.get("exp")
            if exp is not None:
                expired_at = datetime.fromtimestamp(exp, tz=timezone.utc)
                if datetime.now(timezone.utc) - expired_at > timedelta(hours=24):
                    return None
        return payload
    except JWTError:
        return None
