from sqlalchemy import func, case, Integer
from sqlalchemy.orm import Session

from app.models.quality import DataQualityCheck


def get_quality_summary(db: Session) -> list[dict]:
    """Aggregate quality scores per table."""
    results = (
        db.query(
            DataQualityCheck.table_name,
            func.count().label("total"),
            func.sum(case((DataQualityCheck.status == "passed", 1), else_=0)).label("passed"),
            func.sum(case((DataQualityCheck.status == "failed", 1), else_=0)).label("failed"),
            func.sum(case((DataQualityCheck.status == "warning", 1), else_=0)).label("warnings"),
        )
        .group_by(DataQualityCheck.table_name)
        .all()
    )

    summaries = []
    for r in results:
        total = r.total or 1
        passed = r.passed or 0
        summaries.append({
            "table_name": r.table_name,
            "total_checks": total,
            "passed": passed,
            "failed": r.failed or 0,
            "warnings": r.warnings or 0,
            "score": round(passed / total * 100, 1),
        })

    return summaries
