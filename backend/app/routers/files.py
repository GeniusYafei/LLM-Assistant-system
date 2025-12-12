# backend/app/routers/files.py
import os
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status, Query, Form
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.conversation import Conversation
from app.models.document import Document, UserDocument, ConversationDocument
from app.models.user import User
from app.schemas.file import DocumentOut, FileListOut, UsageOut, DocumentUploadResponse
from app.services.quotas import get_quota_state, can_accept_size, maybe_autorelease, warn_needed
from app.services.storage import save_upload_to_disk

router = APIRouter(prefix="/files", tags=["Document Management"])

# Not included in the quota/list status
EXCLUDED_STATUSES = ("archived_quota", "deleted")


@router.get("/usage", response_model=UsageOut)
async def get_usage(
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Get user quota usage info (documents + conversations) from DB function
      SELECT * FROM fn_user_quota_state(:uid, false)
    """
    s = await get_quota_state(db, current_user.id)
    warn = (s.used_ratio >= settings.QUOTA_WARN_RATIO)
    return UsageOut(
        used_bytes=s.used_total_bytes,
        limit_bytes=s.limit_bytes,
        used_ratio=s.used_ratio,
        warn=warn,
    )


@router.get("", response_model=FileListOut)
async def list_my_files(
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
        q: Optional[str] = Query(default=None, description="Filter by filename substring"),
        page: int = Query(default=1, ge=1),
        page_size: int = Query(default=20, ge=1, le=100),
):
    base = (
        select(Document)
        .join(UserDocument, UserDocument.document_id == Document.id)
        .where(UserDocument.user_id == current_user.id)
        .where(~Document.status.in_(EXCLUDED_STATUSES))
    )
    if q:
        base = base.where(Document.filename.ilike(f"%{q}%"))

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    rows = (await db.execute(
        base.order_by(Document.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )).scalars().all()
    items = [DocumentOut.model_validate(x) for x in rows]

    s = await get_quota_state(db, current_user.id)
    warn = (s.used_ratio >= settings.QUOTA_WARN_RATIO)

    return FileListOut(
        items=items,
        total_count=int(total),
        used_bytes=s.used_total_bytes,
        limit_bytes=s.limit_bytes,
        used_ratio=s.used_ratio,
        warn=warn,
    )


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
        file: UploadFile = File(...),
        conversation_id: Optional[UUID] = Form(default=None),
):
    """
    Get the real file size by saving to disk first, then check quota with `fn_can_upload`;
    if not allowed and auto-archive is enabled → call `fn_autorelease_on_message` to release 20% →
    """
    # Get the real file size by saving to disk
    storage_url, size_bytes, sha256_hex = save_upload_to_disk(current_user.id, file.filename, file.file)

    # Check quota prediction (pass this size as incoming_size to DB)
    check = await can_accept_size(db, current_user.id, size_bytes)
    if not check.allowed:
        released = await maybe_autorelease(db, current_user.id)
        if released:
            check = await can_accept_size(db, current_user.id, size_bytes)

    if not check.allowed:
        # Exceeded quota: remove the just-saved file and raise error
        try:
            os.remove(storage_url)
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "error": "quota_exceeded",
                "limit_bytes": check.limit_bytes,
                "would_total": check.would_total,
                "deficit": check.deficit,
                "hint": "Please delete documents or conversations, or enable auto-archive.",
            },
        )

    # Write Document
    doc = Document(
        filename=file.filename,
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=size_bytes,
        storage_url=storage_url,
        sha256=sha256_hex,
        status="uploaded",
    )
    db.add(doc)
    await db.flush()  # need doc.id

    # Associate to the current user as owner
    db.add(UserDocument(user_id=current_user.id, document_id=doc.id, permission="owner"))

    # Optional: associate to a conversation as context
    if conversation_id is not None:
        conv = (await db.execute(
            select(Conversation)
            .where(
                Conversation.id == conversation_id,
                Conversation.user_id == current_user.id
            )
        )).scalar_one_or_none()
        if conv is None:
            raise HTTPException(status_code=404, detail="Conversation not found")
        db.add(ConversationDocument(conversation_id=conversation_id, document_id=doc.id, scope="context"))

    await db.commit()
    await db.refresh(doc)

    # Include quota warning info on success
    return DocumentUploadResponse(
        document=DocumentOut.model_validate(doc),
        quota={
            "limit_bytes": check.limit_bytes,
            "would_total": check.would_total,
            "warning": warn_needed(check.limit_bytes, check.would_total),
            "warning_threshold_ratio": settings.QUOTA_WARN_RATIO,
        },
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_file(
        document_id: UUID,
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Soft delete: only mark Document.status='deleted';
    DB quota calculations will exclude `deleted/archived_quota`.
    """
    doc = (await db.execute(
        select(Document)
        .join(UserDocument, UserDocument.document_id == Document.id)
        .where(UserDocument.user_id == current_user.id, Document.id == document_id)
    )).scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.status != "deleted":
        doc.status = "deleted"
        await db.commit()
