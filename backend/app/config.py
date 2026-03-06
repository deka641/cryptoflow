import logging
import os
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings

_logger = logging.getLogger(__name__)

_INSECURE_DEFAULT_SECRET = "super-secret-change-in-production"

# Resolve .env from project root (two levels up from this file)
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://cryptoflow:cryptoflow123@localhost:5432/cryptoflow"
    REDIS_URL: str = "redis://localhost:6379/0"
    JWT_SECRET: str = _INSECURE_DEFAULT_SECRET
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    COINGECKO_BASE_URL: str = "https://api.coingecko.com/api/v3"
    COINGECKO_RATE_LIMIT: int = 10  # requests per minute
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "https://cryptoflow.deka-labs.dev"]

    @model_validator(mode="after")
    def _warn_insecure_secret(self) -> "Settings":
        if self.JWT_SECRET == _INSECURE_DEFAULT_SECRET:
            _logger.warning(
                "JWT_SECRET is using the insecure default value. "
                "Set the JWT_SECRET environment variable in .env for production use."
            )
        return self

    class Config:
        env_file = str(_ENV_FILE) if _ENV_FILE.exists() else ".env"


settings = Settings()
