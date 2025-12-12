# backend/app/routers/analytics.py
from datetime import datetime, timedelta, timezone
from typing import Annotated, Dict
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.message import Message
from app.models.user import User
from app.schemas.analytics import SummaryMetrics, SummaryOut, TrendsOut, DailyPoint, HourlyPoint

router = APIRouter(prefix="/admin/analytics", tags=["Analytics"])
SYDNEY = ZoneInfo("Australia/Sydney")


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _range_to_days(range_: str) -> int:
    m = {"7d": 7, "30d": 30, "90d": 90}
    return m.get(range_, 7)


def _extract_tokens(meta: dict | None) -> int:
    if not meta:
        return 0
    u = meta.get("usage") or {}
    if isinstance(u, dict):
        if "total_tokens" in u:
            try:
                return int(u["total_tokens"])
            except Exception:
                pass
        total = 0
        for k in ("input_tokens", "output_tokens", "reasoning_tokens"):
            try:
                total += int(u.get(k, 0) or 0)
            except Exception:
                continue
        return total
    return 0


def _extract_latency(meta: dict | None) -> float | None:
    if not meta:
        return None
    val = meta.get("latency_ms")
    try:
        return float(val) if val is not None else None
    except Exception:
        return None


def _is_successful_response(meta: dict | None) -> bool:
    if not meta:
        return True
    status = str(meta.get("status", "")).lower()
    if status in {"error", "failed", "failure"}:
        return False
    if meta.get("error") or meta.get("exception"):
        return False
    return True


async def _compute_summary_metrics(
    db: AsyncSession,
    start: datetime,
    end: datetime,
) -> SummaryMetrics:
    q_count = select(func.count()).where(
        Message.created_at >= start,
        Message.created_at < end,
        Message.role.in_(("user", "assistant")),
    )
    total_messages = int((await db.execute(q_count)).scalar_one())

    q_assist = select(Message.meta).where(
        Message.created_at >= start,
        Message.created_at < end,
        Message.role == "assistant",
    )
    meta_rows = (await db.execute(q_assist)).scalars().all()

    tokens_used = 0
    latencies: list[float] = []
    success_total = len(meta_rows)
    success_count = 0
    for meta in meta_rows:
        tokens_used += _extract_tokens(meta)
        latency = _extract_latency(meta)
        if latency is not None:
            latencies.append(latency)
        if _is_successful_response(meta):
            success_count += 1

    avg_latency = (sum(latencies) / len(latencies)) if latencies else 0.0
    success_rate = (success_count / success_total) if success_total else 1.0

    return SummaryMetrics(
        total_messages=total_messages,
        tokens_used=int(tokens_used),
        avg_latency_ms=float(round(avg_latency, 2)),
        success_rate=float(round(success_rate, 4)),
    )


@router.get("/summary", response_model=SummaryOut)
async def get_summary(
        time_range: str = Query("7d", pattern="^(7d|30d|90d)$", alias="range"),
        db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    days = _range_to_days(time_range)
    now = _now_utc()
    current_start = now - timedelta(days=days)
    previous_start = current_start - timedelta(days=days)

    current_metrics = await _compute_summary_metrics(db, current_start, now)
    previous_metrics = await _compute_summary_metrics(db, previous_start, current_start)

    return SummaryOut(
        range=time_range,
        current=current_metrics,
        previous=previous_metrics,
    )


@router.get("/trends", response_model=TrendsOut)
async def get_trends(
        time_range: str = Query("7d", pattern="^(7d|30d|90d)$", alias="range"),
        db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    now_utc = _now_utc()
    now_sy = now_utc.astimezone(SYDNEY)

    # --- Daily Buckets (Sydney timezone) ---
    days = _range_to_days(time_range)
    today_sy = now_sy.date()
    dates_sy = [today_sy - timedelta(days=i) for i in range(days - 1, -1, -1)]

    # first day 00:00 (Sydney) to now (Sydney)
    start_sy = datetime.combine(dates_sy[0], datetime.min.time(), tzinfo=SYDNEY)
    start_utc = start_sy.astimezone(timezone.utc)

    q7 = select(Message).where(
        Message.created_at >= start_utc,
        Message.created_at < now_utc,
        Message.role == "assistant",
    )
    rows7 = (await db.execute(q7)).scalars().all()

    daily_map: Dict[str, int] = {d.isoformat(): 0 for d in dates_sy}  # 预填 0
    for m in rows7:
        dt_sy = (m.created_at if m.created_at.tzinfo else m.created_at.replace(tzinfo=timezone.utc)).astimezone(SYDNEY)
        key = dt_sy.date().isoformat()
        if key in daily_map:
            daily_map[key] += _extract_tokens(getattr(m, "meta", None))
    daily_points = [DailyPoint(date=k, tokens=v) for k, v in sorted(daily_map.items())]

    # --- 24-hour Hourly Buckets (Sydney timezone) ---
    current_hour_sy = now_sy.replace(minute=0, second=0, microsecond=0)
    hours_sy = [current_hour_sy - timedelta(hours=i) for i in range(23, -1, -1)]
    start_24_sy = hours_sy[0]
    start_24_utc = start_24_sy.astimezone(timezone.utc)

    q24 = select(Message).where(
        Message.created_at >= start_24_utc,
        Message.created_at < now_utc,
        Message.role == "assistant",
    )
    rows24 = (await db.execute(q24)).scalars().all()

    hourly_map: Dict[str, int] = {h.strftime("%H:00"): 0 for h in hours_sy}  # 预填 0
    for m in rows24:
        dt_sy = (m.created_at if m.created_at.tzinfo else m.created_at.replace(tzinfo=timezone.utc)).astimezone(SYDNEY)
        key = dt_sy.strftime("%H:00")
        if key in hourly_map:
            hourly_map[key] += _extract_tokens(getattr(m, "meta", None))

    hourly_points = [HourlyPoint(hour=k, tokens=v) for k, v in sorted(hourly_map.items())]

    return TrendsOut(range=time_range, daily=daily_points, hourly_24h=hourly_points)
