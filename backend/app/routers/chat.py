# backend/app/routers/chat.py
from __future__ import annotations

import asyncio
import json
from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request
from starlette.responses import StreamingResponse

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.conversation import Conversation
from app.models.document import Document, ConversationDocument, UserDocument
from app.models.message import Message, MessageRole
from app.models.session import Session
from app.models.user import User
from app.schemas.chat import ConversationCreate, ConversationOut, ConversationRename, MessageCreate, MessageOut
from app.services.llm_client import get_client
from app.services.quotas import compute_text_bytes, can_accept_size, maybe_autorelease

router = APIRouter(prefix="/chat", tags=["Chat"])


# === Helper Functions ===
def _extract_client_meta(req: Request) -> tuple[str | None, str | None]:
    ip = req.client.host if req and req.client else None
    ua = req.headers.get("User-Agent") if req and req.headers else None
    return ip, ua


async def _create_session_for_user(db: AsyncSession, user: User, req: Request) -> Session:
    ip, ua = _extract_client_meta(req)
    s = Session(
        user_id=user.id,
        ip_address=ip,
        user_agent=ua,
    )
    db.add(s)
    await db.flush()
    return s


async def _get_active_conv(db: AsyncSession, cid: UUID, uid: UUID) -> Conversation | None:
    return (
        await db.execute(
            select(Conversation)
            .where(
                Conversation.id == cid,
                Conversation.user_id == uid,
                Conversation.status != "deleted",
            )
        )).scalar_one_or_none()


async def _ensure_quota_for(db: AsyncSession, user_id: UUID, incoming_size: int) -> bool:
    """
    Wraps "quota check + maybe autorelease and recheck" logic. Returns whether allowed.
    """
    check = await can_accept_size(db, user_id, incoming_size)
    if check.allowed:
        return True
    released = await maybe_autorelease(db, user_id)
    if released:
        check = await can_accept_size(db, user_id, incoming_size)
        return check.allowed
    return False


async def _prepare_document_context(
        db: AsyncSession,
        user_id: UUID,
        conversation_id: UUID,
        document_ids: list[UUID] | None,
) -> list[str]:
    """Validate provided documents and ensure they are linked to the conversation."""
    if not document_ids:
        return []

    # Preserve original order but remove duplicates
    ordered_unique_ids: list[UUID] = list(dict.fromkeys(filter(None, document_ids)))
    if not ordered_unique_ids:
        return []

    result = await db.execute(
        select(Document.id)
        .join(UserDocument, UserDocument.document_id == Document.id)
        .where(
            UserDocument.user_id == user_id,
            Document.id.in_(ordered_unique_ids),
        )
    )
    accessible_ids = set(result.scalars().all())
    if len(accessible_ids) != len(ordered_unique_ids):
        raise HTTPException(status_code=404, detail="Document not found")

    # Link documents to the conversation for future context reuse
    existing_links = await db.execute(
        select(ConversationDocument.document_id)
        .where(
            ConversationDocument.conversation_id == conversation_id,
            ConversationDocument.document_id.in_(ordered_unique_ids),
        )
    )
    linked_ids = set(existing_links.scalars().all())
    for doc_id in ordered_unique_ids:
        if doc_id not in linked_ids:
            db.add(ConversationDocument(conversation_id=conversation_id, document_id=doc_id, scope="context"))

    return [str(doc_id) for doc_id in ordered_unique_ids]


# === List/Create/Rename/Delete Conversations ===
@router.get("/conversations", response_model=List[ConversationOut])
async def list_my_conversations(
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id,
               Conversation.status != "deleted")
        .order_by(Conversation.created_at.desc())
    )
    return [ConversationOut.model_validate(c) for c in result.scalars().all()]


@router.post("/conversations", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def create_conversation(
        payload: ConversationCreate,
        req: Request,
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
):
    sess = await _create_session_for_user(db, current_user, req)
    conv = Conversation(
        user_id=current_user.id,
        session_id=sess.id,
        title=payload.title or "New chat",
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return ConversationOut.model_validate(conv)


@router.patch("/conversations/{conversation_id}", response_model=ConversationOut)
async def rename_conversation(
        conversation_id: UUID,
        payload: ConversationRename,
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
):
    conv = await  _get_active_conv(db, conversation_id, current_user.id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv.title = payload.title
    await db.commit()
    await db.refresh(conv)
    return ConversationOut.model_validate(conv)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_conversation(
        conversation_id: UUID,
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
):
    conv = await _get_active_conv(db, conversation_id, current_user.id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv.status = "deleted"
    await db.commit()
    return


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageOut])
async def list_messages(
        conversation_id: UUID,
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
):
    conv = await _get_active_conv(db, conversation_id, current_user.id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msgs = (
        await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )).scalars().all()
    return [MessageOut.model_validate(m) for m in msgs]


@router.post("/conversations/{conversation_id}/messages", response_model=List[MessageOut],
             status_code=status.HTTP_201_CREATED)
async def send_message_no_stream(
        conversation_id: UUID,
        payload: MessageCreate,
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
):
    conv = await _get_active_conv(db, conversation_id, current_user.id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # ===== Predict quota size before sending message =====
    user_bytes = compute_text_bytes(payload.content)
    if not await _ensure_quota_for(db, current_user.id, user_bytes):
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail="quota_exceeded_on_user_message")

    doc_ids = await _prepare_document_context(db, current_user.id, conv.id, payload.document_ids)
    user_meta = {"document_ids": doc_ids} if doc_ids else {}

    user_msg = Message(
        conversation_id=conv.id,
        session_id=conv.session_id,
        role=MessageRole.user.value,
        content_md=payload.content,
        size_bytes=user_bytes,
        meta=user_meta,
    )
    db.add(user_msg)
    await db.flush()

    # ===== Call mock llm (no stream), and get assistance response =====
    # Call Mock LLM: Pass the username and organization name
    client = get_client()
    display_name = getattr(current_user, "display_name", None) or getattr(current_user, "email", None)
    # Organization name: organization_id (UUID).
    # If there is no organization name, pass None here. Mock is default_org by default.
    organization_name = "default_org"

    answer, usage, latency = await client.assist_no_stream_reply(
        user_message=payload.content,
        user_name=display_name,
        organization_name=organization_name,
    )

    # ===== Check quota predict before writing =====
    assistant_bytes = compute_text_bytes(answer)

    if not await _ensure_quota_for(db, current_user.id, assistant_bytes):
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail="quota_exceeded_on_assistant_message")

    # Save assistant messages (store usage/latency in meta, for your dashboard use)
    assistant_msg = Message(
        conversation_id=conv.id,
        session_id=conv.session_id,
        role=MessageRole.assistant.value,
        content_md=answer,
        size_bytes=assistant_bytes,
        meta={"usage": usage, "latency_ms": latency}
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(user_msg)
    await db.refresh(assistant_msg)

    return [MessageOut.model_validate(user_msg), MessageOut.model_validate(assistant_msg)]


@router.post("/conversations/{conversation_id}/messages/stream")
async def send_message_stream(
        conversation_id: UUID,
        payload: MessageCreate,
        request: Request,
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Streaming Endpoint: Backend as "relay"
    1) Write user message first (quota check)
    2) Connect to mock-llm /chat streaming interface
    3) Relay delta/complete as SSE events to frontend
    4) On complete, do quota check and write assistant message; if not enough → send error event
    SSE Event Format: text/event-stream
      data: {"type":"delta","delta":"..."}\n\n
      data: {"type":"complete","usage":{...},"latency_ms":...}\n\n
      data: {"type":"error","error":"..."}\n\n
    """
    conv = await _get_active_conv(db, conversation_id, current_user.id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Before sending: verify user quota for the user message + write
    user_bytes = compute_text_bytes(payload.content)

    if not await _ensure_quota_for(db, current_user.id, user_bytes):
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail="quota_exceeded_on_user_message")

    doc_ids = await _prepare_document_context(db, current_user.id, conv.id, payload.document_ids)
    user_meta = {"document_ids": doc_ids} if doc_ids else {}

    user_msg = Message(
        conversation_id=conv.id,
        session_id=conv.session_id,
        role=MessageRole.user.value,
        content_md=payload.content,
        size_bytes=user_bytes,
        meta=user_meta,
    )
    db.add(user_msg)
    await db.flush()

    client = get_client()
    display_name = getattr(current_user, "display_name", None) or getattr(current_user, "email", None)
    organization_name = "default_org"

    async def event_gen():
        assistant_text_chunks: list[str] = []
        received_delta = False
        usage: dict = {}
        latency_ms: float = 0.0
        try:
            # Connect to mock-llm streaming interface, forwarding while receiving
            async for ev in client.assist_stream_reply(
                    user_message=payload.content,
                    user_name=display_name,
                    organization_name=organization_name,
            ):
                # Client disconnected actively
                if await request.is_disconnected():
                    break

                mtype = ev.get("type")

                if mtype == "delta":
                    delta = ev.get("delta") or ""
                    if delta:
                        assistant_text_chunks.append(delta)
                        received_delta = True
                        yield f'data: {json.dumps({"type": "delta", "delta": delta})}\n\n'.encode("utf-8")

                elif mtype == "complete":
                    usage = ev.get("usage") or {}
                    latency_ms = float(ev.get("latency_ms") or 0.0)
                    final_answer = ev.get("answer") or ev.get("delta") or ev.get("llm_answer") or ""
                    if final_answer and not received_delta:
                        assistant_text_chunks.append(final_answer)
                    complete_event = {"type": "complete", "usage": usage, "latency_ms": latency_ms}
                    if final_answer:
                        complete_event["answer"] = final_answer
                    yield f'data: {json.dumps(complete_event)}\n\n'.encode("utf-8")
                    break

                elif mtype == "error":
                    yield f'data: {json.dumps({"type": "error", "error": ev.get("error", "unknown")})}\n\n'.encode(
                        "utf-8")
                    return

                await asyncio.sleep(0)

            # Complete text splicing and quota check
            assistant_text = "".join(assistant_text_chunks)
            assistant_bytes = compute_text_bytes(assistant_text)

            if not await _ensure_quota_for(db, current_user.id, assistant_bytes):
                yield f"data: {json.dumps({'type': 'error', 'error': 'quota_exceeded_on_assistant_message'})}\n\n".encode(
                    'utf-8')
                return

            # Quota enough → write assistant message
            assistant_msg = Message(
                conversation_id=conv.id,
                session_id=conv.session_id,
                role=MessageRole.assistant.value,
                content_md=assistant_text,
                size_bytes=assistant_bytes,
                meta={"usage": usage, "latency_ms": latency_ms},
            )
            db.add(assistant_msg)
            await db.commit()

            # Final ack event with message ID
            ack = {"type": "saved", "message_id": str(assistant_msg.id)}
            yield f"data: {json.dumps(ack)}\n\n".encode("utf-8")

        except Exception as e:
            err = {"type": "error", "error": f"backend_stream_error: {str(e)}"}
            yield f"data: {json.dumps(err)}\n\n".encode("utf-8")

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
