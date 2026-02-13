import math
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.pipeline import PipelineRun
from app.models.market_data import FactMarketData
from app.schemas.pipeline import PipelineRunResponse, PipelineHealth
from app.schemas.pagination import PaginatedResponse

router = APIRouter()


@router.get("/runs", response_model=PaginatedResponse)
def list_pipeline_runs(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    dag_id: str | None = Query(None, description="Filter by DAG id"),
    db: Session = Depends(get_db),
):
    """List pipeline runs with optional filtering by DAG id."""
    query = db.query(PipelineRun)

    if dag_id:
        query = query.filter(PipelineRun.dag_id == dag_id)

    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1

    runs = (
        query
        .order_by(PipelineRun.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    items = [PipelineRunResponse.model_validate(run) for run in runs]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.get("/health", response_model=list[PipelineHealth])
def pipeline_health(db: Session = Depends(get_db)):
    """Return the health status for each DAG based on its most recent run."""
    # Get distinct DAG ids
    dag_ids = [
        row[0]
        for row in db.query(PipelineRun.dag_id).distinct().all()
    ]

    # Most recent data timestamp for freshness calculation
    latest_data_ts = db.query(func.max(FactMarketData.timestamp)).scalar()
    now = datetime.now()  # Use local time since DB timestamps are timezone-naive local

    results = []
    for dag in dag_ids:
        last_run = (
            db.query(PipelineRun)
            .filter(PipelineRun.dag_id == dag)
            .order_by(PipelineRun.created_at.desc())
            .first()
        )

        freshness_minutes = None
        if latest_data_ts:
            naive_ts = latest_data_ts.replace(tzinfo=None) if latest_data_ts.tzinfo else latest_data_ts
            freshness_minutes = round((now - naive_ts).total_seconds() / 60, 1)

        last_status = last_run.status if last_run else None
        last_time = last_run.end_time or last_run.start_time if last_run else None

        # A DAG is healthy if its last run succeeded and data is reasonably fresh (<60 min)
        is_healthy = (
            last_status == "success"
            and freshness_minutes is not None
            and freshness_minutes < 60
        )

        results.append(
            PipelineHealth(
                dag_id=dag,
                last_run_status=last_status,
                last_run_time=last_time,
                data_freshness_minutes=freshness_minutes,
                is_healthy=is_healthy,
            )
        )

    return results
