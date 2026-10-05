from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel

T = TypeVar("T")

class MetaPagination(BaseModel):
    page: int = 1
    page_size: int = 20
    total: int = 0

class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T
    meta: Optional[MetaPagination] = None
