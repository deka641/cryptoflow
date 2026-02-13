from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://cryptoflow:cryptoflow123@localhost:5432/cryptoflow"
    REDIS_URL: str = "redis://localhost:6379/0"
    JWT_SECRET: str = "super-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    COINGECKO_BASE_URL: str = "https://api.coingecko.com/api/v3"
    COINGECKO_RATE_LIMIT: int = 10  # requests per minute
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "https://cryptoflow.deka-labs.dev"]

    class Config:
        env_file = ".env"


settings = Settings()
