from pydantic import BaseModel
from datetime import datetime

class QualityCheckResponse(BaseModel):
    id: int
    check_name: str
    table_name: str
    status: str
    details: dict | None = None
    executed_at: datetime

    class Config:
        from_attributes = True

class QualitySummary(BaseModel):
    table_name: str
    total_checks: int
    passed: int
    failed: int
    warnings: int
    score: float  # percentage passed
