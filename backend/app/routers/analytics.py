from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
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
