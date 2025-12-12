# backend/app/schemas/analytics.py
from typing import List

from pydantic import BaseModel, Field


class SummaryMetrics(BaseModel):
    total_messages: int = Field(..., description="user+assistant messages in range")
    tokens_used: int = Field(..., description="sum of usage tokens (assistant meta)")
    avg_latency_ms: float = Field(..., description="average latency_ms of assistant messages")
    success_rate: float = Field(..., description="0.0 ~ 1.0")


class SummaryOut(BaseModel):
    range: str = Field(..., description="the requested analytics window (e.g. 7d)")
    current: SummaryMetrics
    previous: SummaryMetrics


class DailyPoint(BaseModel):
    date: str  # e.g. "2025-11-04" (Sydney)
    tokens: int


class HourlyPoint(BaseModel):
    hour: str  # e.g. "13:00" (Sydney)
    tokens: int


class TrendsOut(BaseModel):
    range: str
    daily: List[DailyPoint]
    hourly_24h: List[HourlyPoint]
