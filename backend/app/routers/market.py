from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.market import MarketOverview, KpiSparklineResponse
from app.services import market_service

router = APIRouter()


@router.get("/overview", response_model=MarketOverview)
def market_overview(db: Session = Depends(get_db)):
    """Get a high-level overview of the crypto market."""
    data = market_service.get_market_overview(db)
    return MarketOverview(**data)


@router.get("/kpi-sparklines", response_model=KpiSparklineResponse)
def kpi_sparklines(db: Session = Depends(get_db)):
    """Get 7-day sparkline data for KPI cards (market cap, volume, BTC dominance)."""
    data = market_service.get_kpi_sparklines(db)
    return KpiSparklineResponse(**data)
