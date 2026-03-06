from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.analytics import AnalyticsVolatility
from app.models.coin import DimCoin
from app.schemas.analytics import CorrelationMatrix, VolatilityEntry
from app.services import analytics_service

router = APIRouter()


@router.get("/correlation", response_model=CorrelationMatrix)
def get_correlation(
    period_days: int = Query(30, ge=1, le=365, description="Correlation period in days"),
    top_n: int = Query(15, ge=5, le=50, description="Number of top coins to include"),
    db: Session = Depends(get_db),
):
    """Get the price correlation matrix for top coins by market cap."""
    data = analytics_service.get_correlation_matrix(db, period_days=period_days, top_n=top_n)
    return CorrelationMatrix(**data)


@router.get("/volatility", response_model=list[VolatilityEntry])
def get_volatility(
    period_days: int = Query(30, ge=1, le=365, description="Volatility period in days"),
    db: Session = Depends(get_db),
):
    """Get coins ranked by volatility over the given period."""
    data = analytics_service.get_volatility_ranking(db, period_days=period_days)
    return [VolatilityEntry(**entry) for entry in data]


@router.get("/volatility/{coin_id}/history")
def get_volatility_history(
    coin_id: int,
    db: Session = Depends(get_db),
):
    """Get volatility metrics history for a specific coin (all available periods)."""
    coin = db.query(DimCoin).filter(DimCoin.id == coin_id).first()
    if not coin:
        return {"coin_id": coin_id, "entries": []}

    entries = (
        db.query(AnalyticsVolatility)
        .filter(AnalyticsVolatility.coin_id == coin_id)
        .order_by(AnalyticsVolatility.period_days.asc())
        .all()
    )

    return {
        "coin_id": coin_id,
        "symbol": coin.symbol,
        "entries": [
            {
                "period_days": e.period_days,
                "volatility": float(e.volatility) if e.volatility else None,
                "max_drawdown": float(e.max_drawdown) if e.max_drawdown else None,
                "sharpe_ratio": float(e.sharpe_ratio) if e.sharpe_ratio else None,
                "computed_at": e.computed_at.isoformat() if e.computed_at else None,
            }
            for e in entries
        ],
    }
