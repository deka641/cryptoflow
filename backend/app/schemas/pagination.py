from pydantic import BaseModel
from typing import Generic, TypeVar
from pydantic import Field

T = TypeVar("T")

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    per_page: int
    pages: int
