# backend/app/services/quotas.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Sequence, List, Dict
from uuid import UUID as _UUID

from sqlalchemy import select, func, bindparam
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.conversation import Conversation
from app.models.document import Document, UserDocument

EXCLUDED_STATUSES = ("deleted", "archived_quota")


@dataclass
class QuotaState:
    user_id: str
    limit_bytes: int
    used_conv_bytes: int
    used_doc_bytes: int
    used_total_bytes: int
    used_ratio: float


@dataclass
class UploadCheck:
    allowed: bool
    limit_bytes: int
    would_total: int
    deficit: int


def compute_text_bytes(s: str) -> int:
    return len((s or "").encode("utf-8"))


def _row_to_quota_state(row: Sequence[Any]) -> QuotaState:
    return QuotaState(
        user_id=str(row[0]),
        limit_bytes=int(row[1]),
        used_conv_bytes=int(row[2]),
        used_doc_bytes=int(row[3]),
        used_total_bytes=int(row[4]),
        used_ratio=float(row[5]),
    )


async def _sum_deleted_conv_bytes(db: AsyncSession, user_id: _UUID) -> int:
    """
    Count the storage size of conversations that have been soft-deleted for the current user (conversation.storage_size).
    """
    q = (
        select(func.coalesce(func.sum(Conversation.storage_size), 0))
        .where(Conversation.user_id == user_id, Conversation.status == "deleted")
    )
    return int((await db.execute(q)).scalar_one())


async def _sum_deleted_doc_bytes(db: AsyncSession, user_id: _UUID) -> int:
    """
    Count the storage size of documents that have been soft-deleted for the current user (size_bytes + processed_text_bytes).
    """
    doc_bytes = func.coalesce(
        func.sum(Document.size_bytes + func.coalesce(Document.processed_text_bytes, 0)),
        0,
    )
    q = (
        select(doc_bytes)
        .join(UserDocument, UserDocument.document_id == Document.id)
        .where(UserDocument.user_id == user_id, Document.status == "deleted")
    )
    return int((await db.execute(q)).scalar_one())


async def get_quota_state(db: AsyncSession, user_id: _UUID) -> QuotaState:
    stmt = (
        text("SELECT * FROM fn_user_quota_state(:uid, :include_archived)")
        .bindparams(
            bindparam("uid", type_=PGUUID(as_uuid=True)),
            bindparam("include_archived"),
        )
    )
    base_row = (await db.execute(stmt, {"uid": user_id, "include_archived": False})).first()
    if not base_row:
        return QuotaState(
            user_id=str(user_id),
            limit_bytes=int(settings.QUOTA_DEFAULT_LIMIT_BYTES),
            used_conv_bytes=0,
            used_doc_bytes=0,
            used_total_bytes=0,
            used_ratio=0.0,
        )
    base = _row_to_quota_state(base_row)
    # Minus "deleted" conversations and documents
    del_conv = await _sum_deleted_conv_bytes(db, user_id)
    del_doc = await _sum_deleted_doc_bytes(db, user_id)

    used_conv = max(0, base.used_conv_bytes - del_conv)
    used_doc = max(0, base.used_doc_bytes - del_doc)
    used_total = used_conv + used_doc
    ratio = (used_total / base.limit_bytes) if base.limit_bytes > 0 else 0.0

    return QuotaState(
        user_id=base.user_id,
        limit_bytes=base.limit_bytes,
        used_conv_bytes=used_conv,
        used_doc_bytes=used_doc,
        used_total_bytes=used_total,
        used_ratio=ratio,
    )


async def can_accept_size(db: AsyncSession, user_id: _UUID, incoming_size: int) -> UploadCheck:
    s = await get_quota_state(db, user_id)
    inc = int(max(0, incoming_size))
    would_total = s.used_total_bytes + inc
    allowed = (s.limit_bytes <= 0) or (would_total <= s.limit_bytes)
    deficit = max(0, would_total - s.limit_bytes)
    return UploadCheck(
        allowed=bool(allowed),
        limit_bytes=int(s.limit_bytes),
        would_total=int(would_total),
        deficit=int(deficit),
    )


async def maybe_autorelease(db: AsyncSession, user_id: _UUID) -> List[Dict]:
    """
    When the auto-archive-on-limit setting is enabled, call the SQL-side function to
    automatically release 20% of the quota; otherwise, return an empty list.
    """
    if not settings.QUOTA_AUTO_ARCHIVE_ON_LIMIT:
        return []
    stmt = (
        text("SELECT * FROM fn_autorelease_on_message(:uid)")
        .bindparams(bindparam("uid", type_=PGUUID(as_uuid=True)))
    )
    rows = (await db.execute(stmt, {"uid": user_id})).fetchall() or []
    return [{"kind": r[0], "id": str(r[1]), "bytes": int(r[2])} for r in rows]


def warn_needed(limit_bytes: int, would_total: int) -> bool:
    return (limit_bytes > 0) and ((would_total / limit_bytes) >= settings.QUOTA_WARN_RATIO)
