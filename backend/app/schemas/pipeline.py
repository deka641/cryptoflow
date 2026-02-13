from pydantic import BaseModel
from datetime import datetime

class PipelineRunResponse(BaseModel):
    id: int
    dag_id: str
    status: str
    start_time: datetime | None
    end_time: datetime | None
    records_processed: int
    error_message: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True

class PipelineHealth(BaseModel):
    dag_id: str
    last_run_status: str | None
    last_run_time: datetime | None
    data_freshness_minutes: float | None
    is_healthy: bool
