# backend/app/services/llm_client.py
from __future__ import annotations

import asyncio
import json
from typing import Any, Tuple, AsyncGenerator, Optional, Dict

import httpx

from app.core.config import settings

CANDIDATE_PATHS = ["/chat", "/generate", "/respond"]


class LLMClient:
    """
    Encapsulates Mock LLM's Non-Streaming and Streaming endpoints.
    """

    def __init__(self, base_url: str, timeout: float = 10.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    # === Helper Methods ===
    @staticmethod
    def _build_payload(user_message: str, user_name: Optional[str], organization_name: Optional[str]) -> Dict[str, Any]:
        return {
            "user_name": user_name or "anonymous",
            "organisation_name": organization_name or "default_org",
            "question": user_message,
        }

    @staticmethod
    def _extract_answer(data: Dict[str, Any], *, prefer_delta: bool = False) -> str:
        """Pick the most appropriate textual payload from an LLM event."""
        keys = ["delta", "llm_answer", "answer", "content", "reply", "output", "text"]
        if not prefer_delta:
            # For completion events we want the final full answer first
            keys = ["llm_answer", "answer", "content", "reply", "output", "text", "delta"]
        for key in keys:
            val = data.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()
        # Compatibility with nested payloads such as {"message": {"content": "..."}}
        message = data.get("message")
        if isinstance(message, dict):
            for key in ("content", "text"):
                val = message.get(key)
                if isinstance(val, str) and val.strip():
                    return val.strip()
        return ""

    @staticmethod
    def _normalize_event(raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        Return types:
          {"type":"delta","delta":"..."} /
          {"type":"complete","usage":{...},"latency_ms":1234.5,"answer":"..."} /
          {"type":"error","error":"..."}
        """
        mtype = raw.get("type") or raw.get("message_type")
        alias_map = {
            "stream_delta": "delta",
            "stream_end": "complete",
            "stream_start": "start",
            "status_update": "status",
        }
        if mtype in alias_map:
            mtype = alias_map[mtype]
        if not mtype:
            # If no explicit type, but contains delta/llm_answer, infer it
            if "delta" in raw or "llm_answer" in raw:
                mtype = "delta"
            else:
                mtype = "unknown"

        if mtype == "delta":
            return {"type": "delta", "delta": LLMClient._extract_answer(raw, prefer_delta=True)}

        if mtype == "complete":
            answer = LLMClient._extract_answer(raw)
            return {
                "type": "complete",
                "answer": answer,
                "usage": raw.get("usage") or {},
                "latency_ms": float(raw.get("latency_ms") or 0.0),
            }

        if mtype == "error":
            return {"type": "error", "error": raw.get("error") or "unknown"}

        # Ignored unknown type
        return {"type": "unknown"}

    # === Non-stream reply ===
    async def assist_no_stream_reply(
            self,
            user_message: str,
            user_name: str | None,
            organization_name: str | None,
    ) -> Tuple[str, Dict[str, Any], float | None]:
        """
        Call /chat_no_stream no-stream endpoints of the mock LLM service.
        return (llm_answer, usage_dict, latency_ms)
        """
        url = f"{self.base_url}/chat_no_stream"
        payload = self._build_payload(user_message, user_name, organization_name)

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(url, json=payload)
            res.raise_for_status()
            data = res.json()
            answer = self._extract_answer(data)
            usage = data.get("usage") or {}
            latency_ms = float(data.get("latency_ms") or 0.0)
            return answer, usage, latency_ms

    # === Streaming reply ===
    async def assist_stream_reply(
            self,
            user_message: str,
            user_name: str | None,
            organization_name: str | None,
    ) -> AsyncGenerator[dict, None]:
        """
        Connect to the streaming endpoint /chat of mock-llm, supporting two return types:
          {"message_type": "delta", "delta": "..."} or
          {"message_type": "complete", "llm_answer": "...", "usage": {...}, "latency_ms": 1234.5}
          {"message_type": "error", "error": "..."} (on exception)
        """
        url = f"{self.base_url}/chat"
        payload = self._build_payload(user_message, user_name, organization_name)

        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream("POST", url, json=payload, timeout=self.timeout) as res:
                    res.raise_for_status()
                    async for raw_line in res.aiter_lines():
                        if raw_line is None:
                            # Nap time for a bit
                            await asyncio.sleep(0)
                            continue
                        line = raw_line.strip()
                        if not line:
                            continue
                        # SSE compatibility: lines start with "data:"
                        if line.startswith("data:"):
                            line = line[5:].strip()
                        # Mark stream end
                        if line == "[DONE]":
                            continue

                        try:
                            raw_event = json.loads(line)
                        except Exception:
                            # Ignored invalid JSON line
                            continue
                        # Directly yield complete messages
                        event = self._normalize_event(raw_event)
                        etype = event.get("type")
                        if etype in ("delta", "complete", "error"):
                            yield event

        except httpx.HTTPError as e:
            yield {"type": "error", "error": f"http_error: {str(e)}"}
        except Exception as e:
            yield {"type": "error", "error": f"stream_error: {str(e)}"}


# Module-level singleton: avoid re-initialization
_client: LLMClient | None = None


def get_client() -> LLMClient:
    global _client
    if _client is None:
        _client = LLMClient(
            settings.MOCK_LLM_BASE_URL,
            settings.MOCK_LLM_TIMEOUT,
        )
    return _client
