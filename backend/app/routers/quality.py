import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.quality import DataQualityCheck
from app.schemas.quality import QualityCheckResponse, QualitySummary
from app.schemas.pagination import PaginatedResponse
from app.services import quality_service

router = APIRouter()


@router.get("/checks", response_model=PaginatedResponse)
def list_quality_checks(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    status: str | None = Query(None, description="Filter by status (passed, failed, warning)"),
    table_name: str | None = Query(None, description="Filter by table name"),
    db: Session = Depends(get_db),
):
    """List data quality checks with optional filtering."""
    query = db.query(DataQualityCheck)

    if status:
        query = query.filter(DataQualityCheck.status == status)
    if table_name:
        query = query.filter(DataQualityCheck.table_name == table_name)

    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1

    checks = (
        query
        .order_by(DataQualityCheck.executed_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    items = [QualityCheckResponse.model_validate(check) for check in checks]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.get("/summary", response_model=list[QualitySummary])
def quality_summary(db: Session = Depends(get_db)):
    """Get an aggregated quality score summary per table."""
    data = quality_service.get_quality_summary(db)
    return [QualitySummary(**entry) for entry in data]
