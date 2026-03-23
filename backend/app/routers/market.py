from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
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


@router.get("/sectors")
def get_sector_performance(db: Session = Depends(get_db)):
    """Get performance metrics grouped by coin category/sector."""
    rows = db.execute(text("""
        SELECT
            c.category,
            AVG(m.price_change_24h_pct) AS avg_change_24h,
            SUM(m.market_cap) AS total_market_cap,
            COUNT(*) AS coin_count
        FROM dim_coin c
        JOIN mv_latest_market_data m ON c.id = m.coin_id
        WHERE c.category IS NOT NULL
        GROUP BY c.category
        ORDER BY total_market_cap DESC
    """)).fetchall()

    return [
        {
            "category": row.category,
            "avg_change_24h": float(row.avg_change_24h) if row.avg_change_24h is not None else 0,
            "total_market_cap": float(row.total_market_cap) if row.total_market_cap is not None else 0,
            "coin_count": row.coin_count,
        }
        for row in rows
    ]


@router.get("/dominance")
def get_market_dominance(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
):
    """Get market dominance (% of total market cap) for the top 10 coins over time."""
    return market_service.get_market_dominance(db, days)


@router.get("/sentiment")
async def get_market_sentiment():
    """Get the Fear & Greed Index (cached for 1 hour)."""
    from app.services.sentiment_service import get_fear_greed_index

    return await get_fear_greed_index()
