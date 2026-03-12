import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app

# Use the same database but in a transaction that gets rolled back
from app.config import settings
TEST_DB_URL = settings.DATABASE_URL

engine = create_engine(TEST_DB_URL)
TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db

    # Clear login rate limiter state before each test (in-memory + Redis)
    from app.routers.auth import _clear_rate_limits
    _clear_rate_limits()

    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
