from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.market import MarketOverview
from app.services import market_service

router = APIRouter()


@router.get("/overview", response_model=MarketOverview)
def market_overview(db: Session = Depends(get_db)):
    """Get a high-level overview of the crypto market."""
    data = market_service.get_market_overview(db)
    return MarketOverview(**data)
