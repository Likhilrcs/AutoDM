from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
import re

class TriggerSchema(BaseModel):
    type: Literal["comment_keyword"] = "comment_keyword"
    keyword: str = Field(..., min_length=1, max_length=50)
    match_mode: Literal["exact", "contains"] = "contains"
    case_sensitive: bool = False

class AutomationStats(BaseModel):
    executions: int = 0
    success: int = 0
    failed: int = 0

class AutomationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    social_account_id: str
    external_post_id: str
    post_url: Optional[str] = None
    trigger: TriggerSchema
    dm_message: str = Field(..., min_length=1, max_length=1000)
    link_url: Optional[str] = None
    allow_repeat: bool = False
    reply_mode: Literal["static", "ai"] = "static"
    ai_instructions: Optional[str] = Field(None, max_length=500)
    intent_gate_enabled: bool = False
    intent_gate_description: Optional[str] = Field(None, max_length=200)
    status: Literal["draft", "active", "paused"] = "draft"

    @field_validator("link_url")
    @classmethod
    def validate_link_url(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != "":
            if not v.startswith("https://"):
                raise ValueError("link_url must start with https://")
        return v or None

class AutomationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    post_url: Optional[str] = None
    trigger: Optional[TriggerSchema] = None
    dm_message: Optional[str] = Field(None, min_length=1, max_length=1000)
    link_url: Optional[str] = None
    allow_repeat: Optional[bool] = None
    reply_mode: Optional[Literal["static", "ai"]] = None
    ai_instructions: Optional[str] = Field(None, max_length=500)
    intent_gate_enabled: Optional[bool] = None
    intent_gate_description: Optional[str] = Field(None, max_length=200)
    status: Optional[Literal["draft", "active", "paused"]] = None

    @field_validator("link_url")
    @classmethod
    def validate_link_url(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != "":
            if not v.startswith("https://"):
                raise ValueError("link_url must start with https://")
        return v

class AutomationResponse(BaseModel):
    id: str
    name: str
    social_account_id: Optional[str] = None
    external_post_id: Optional[str] = None
    post_url: Optional[str] = None
    status: str
    trigger: TriggerSchema
    dm_message: str
    link_url: Optional[str] = None
    allow_repeat: bool = False
    reply_mode: str = "static"
    ai_instructions: Optional[str] = None
    intent_gate_enabled: bool = False
    intent_gate_description: Optional[str] = None
    stats: AutomationStats = Field(default_factory=AutomationStats)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class AutomationListItem(BaseModel):
    id: str
    name: str
    keyword: str
    post_url: Optional[str] = None
    status: str
    reply_mode: str = "static"
    executions: int = 0
    created_at: Optional[datetime] = None
