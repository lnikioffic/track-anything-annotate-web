from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class TrackingTaskMessage(BaseModel):
    task_id: UUID
    storage_path: str
    file_name: str
    metadata: str


class TrackingResult(BaseModel):
    task_id: UUID
    status: str = Field(default='completed')
    progress: int = Field(default=100)
    frames_processed: int = Field(default=0)
    total_frames: int = Field(default=0)
    metadata: dict[str, Any] = Field(default_factory=dict)
