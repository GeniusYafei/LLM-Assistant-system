# backend/app/services/llm_client.py
from __future__ import annotations

import asyncio
import json
from typing import Any, Tuple, AsyncGenerator, Optional, Dict

import httpx

from app.core.config import settings


class LLMClient:
    """Simple Ollama client used by chat routes."""

    def __init__(self, base_url: str, model: str, timeout: float = 60.0):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    # === Helper Methods ===
    def _build_payload(self, user_message: str, user_name: Optional[str], organization_name: Optional[str], *, stream: bool) -> Dict[str, Any]:
        system_msg = (
            f"You are assisting {user_name or 'anonymous'} from {organization_name or 'default_org'}. "
            "Respond helpfully and concisely."
        )
        return {
            "model": self.model,
            "stream": stream,
            "messages": [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_message},
            ],
        }

    @staticmethod
    def _extract_message_content(data: Dict[str, Any]) -> str:
        message = data.get("message")
        if isinstance(message, dict):
            content = message.get("content")
            if isinstance(content, str):
                return content
        return ""

    @staticmethod
    def _build_usage(data: Dict[str, Any]) -> Dict[str, Any]:
        prompt_tokens = int(data.get("prompt_eval_count") or 0)
        completion_tokens = int(data.get("eval_count") or 0)
        total_tokens = prompt_tokens + completion_tokens
        return {
            "input_tokens": prompt_tokens,
            "output_tokens": completion_tokens,
            "total_tokens": total_tokens,
        }

    @staticmethod
    def _extract_latency_ms(data: Dict[str, Any]) -> float:
        # Ollama returns durations in nanoseconds
        total_duration_ns = float(data.get("total_duration") or 0.0)
        return total_duration_ns / 1_000_000.0 if total_duration_ns else 0.0

    # === Non-stream reply ===
    async def assist_no_stream_reply(
            self,
            user_message: str,
            user_name: str | None,
            organization_name: str | None,
    ) -> Tuple[str, Dict[str, Any], float | None]:
        """
        Call Ollama /api/chat with stream disabled.
        return (llm_answer, usage_dict, latency_ms)
        """
        url = f"{self.base_url}/api/chat"
        payload = self._build_payload(user_message, user_name, organization_name, stream=False)

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(url, json=payload)
            res.raise_for_status()
            data = res.json()
            answer = self._extract_message_content(data)
            usage = self._build_usage(data)
            latency_ms = self._extract_latency_ms(data)
            return answer, usage, latency_ms

    # === Streaming reply ===
    async def assist_stream_reply(
            self,
            user_message: str,
            user_name: str | None,
            organization_name: str | None,
    ) -> AsyncGenerator[dict, None]:
        """
        Connect to Ollama /api/chat with streaming enabled and normalize events
        to delta/complete/error for the chat router.
        """
        url = f"{self.base_url}/api/chat"
        payload = self._build_payload(user_message, user_name, organization_name, stream=True)

        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream("POST", url, json=payload, timeout=self.timeout) as res:
                    res.raise_for_status()
                    async for raw_line in res.aiter_lines():
                        if raw_line is None:
                            await asyncio.sleep(0)
                            continue
                        line = (raw_line or "").strip()
                        if not line:
                            continue

                        try:
                            raw_event = json.loads(line)
                        except Exception:
                            # Ignore invalid JSON lines
                            continue

                        if raw_event.get("error"):
                            yield {"type": "error", "error": raw_event.get("error")}
                            return

                        if raw_event.get("done"):
                            usage = self._build_usage(raw_event)
                            latency_ms = self._extract_latency_ms(raw_event)
                            final_answer = self._extract_message_content(raw_event)
                            complete_event: Dict[str, Any] = {
                                "type": "complete",
                                "usage": usage,
                                "latency_ms": latency_ms,
                            }
                            if final_answer:
                                complete_event["answer"] = final_answer
                            yield complete_event
                            return

                        delta = self._extract_message_content(raw_event)
                        if delta:
                            yield {"type": "delta", "delta": delta}

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
            settings.OLLAMA_BASE_URL,
            settings.OLLAMA_MODEL,
            settings.OLLAMA_TIMEOUT,
        )
    return _client
