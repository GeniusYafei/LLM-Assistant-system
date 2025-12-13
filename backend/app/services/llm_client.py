# backend/app/services/llm_client.py
from __future__ import annotations

import asyncio
import json
from typing import Any, Tuple, AsyncGenerator, Optional, Dict

import httpx

from app.core.config import settings


class LLMClient:
    """Simple Ollama client used by chat routes."""

    def __init__(self, base_url: str, model: str, timeout: float = 60.0, options: dict | None = None):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self.options = options or {}

    # === Helper Methods ===
    def _build_payload(self, user_message: str, user_name: Optional[str], organization_name: Optional[str], *, stream: bool) -> Dict[str, Any]:
        system_msg = (
            f"You are assisting {user_name or 'anonymous'} from {organization_name or 'default_org'}. "
            "Respond helpfully and concisely."
        )
        payload = {
            "model": self.model,
            "stream": stream,
            "messages": [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_message},
            ],
        }

        if self.options:
            payload["options"] = self.options

        return payload

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
        reasoning_tokens = int(
            data.get("reasoning_tokens")
            or data.get("reasoning_count")
            or 0
        )
        return {
            "input_tokens": prompt_tokens,
            "output_tokens": completion_tokens,
            "reasoning_tokens": reasoning_tokens,
            "total_tokens": total_tokens + reasoning_tokens,
        }

    @staticmethod
    def _extract_latency_ms(data: Dict[str, Any]) -> float:
        # Ollama returns durations in nanoseconds
        total_duration_ns = float(data.get("total_duration") or 0.0)
        return total_duration_ns / 1_000_000.0 if total_duration_ns else 0.0

    @staticmethod
    def _extract_reasoning_content(data: Dict[str, Any]) -> str:
        message = data.get("message")
        if isinstance(message, dict):
            for key in ("reasoning", "reasoning_content", "thinking"):
                value = message.get(key)
                if isinstance(value, str):
                    return value

        for key in ("reasoning", "reasoning_content", "thinking"):
            value = data.get(key)
            if isinstance(value, str):
                return value

        return ""

    # === Non-stream reply ===
    async def assist_no_stream_reply(
            self,
            user_message: str,
            user_name: str | None,
            organization_name: str | None,
    ) -> Tuple[str, Dict[str, Any], float | None, str]:
        """
        Call Ollama /api/chat with stream disabled.
        return (llm_answer, usage_dict, latency_ms, reasoning)
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
            reasoning = self._extract_reasoning_content(data)
            return answer, usage, latency_ms, reasoning

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
                            reasoning = self._extract_reasoning_content(raw_event)
                            complete_event: Dict[str, Any] = {
                                "type": "complete",
                                "usage": usage,
                                "latency_ms": latency_ms,
                            }
                            if final_answer:
                                complete_event["answer"] = final_answer
                            if reasoning:
                                complete_event["reasoning"] = reasoning
                            yield complete_event
                            return

                        delta = self._extract_message_content(raw_event)
                        if delta:
                            yield {"type": "delta", "delta": delta}

                        reasoning_delta = self._extract_reasoning_content(raw_event)
                        if reasoning_delta:
                            yield {"type": "thinking", "delta": reasoning_delta}

        except httpx.HTTPError as e:
            yield {"type": "error", "error": f"http_error: {str(e)}"}
        except Exception as e:
            yield {"type": "error", "error": f"stream_error: {str(e)}"}


class MockLLMClient:
    """Adapter for the bundled mock LLM service (Flask)."""

    def __init__(self, base_url: str, timeout: float = 60.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    @staticmethod
    def _build_usage(data: Dict[str, Any]) -> Dict[str, Any]:
        usage = data.get("usage")
        if isinstance(usage, dict):
            return {
                "input_tokens": int(usage.get("input_tokens") or 0),
                "output_tokens": int(usage.get("output_tokens") or 0),
                "reasoning_tokens": int(usage.get("reasoning_tokens") or 0),
                "total_tokens": int(usage.get("total_tokens") or 0),
            }
        return {"input_tokens": 0, "output_tokens": 0, "reasoning_tokens": 0, "total_tokens": 0}

    async def assist_no_stream_reply(
            self,
            user_message: str,
            user_name: str | None,
            organization_name: str | None,
    ) -> Tuple[str, Dict[str, Any], float | None, str]:
        url = f"{self.base_url}/chat_no_stream"
        payload = {
            "question": user_message,
            "user_name": user_name or "anonymous",
            "organisation_name": organization_name or "default_org",
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(url, json=payload)
            res.raise_for_status()
            data = res.json()
            answer = str(data.get("llm_answer") or "")
            usage = self._build_usage(data)
            latency_ms = data.get("latency_ms")
            reasoning = str(data.get("reasoning") or "") if data.get("reasoning") else ""
            return answer, usage, float(latency_ms) if latency_ms is not None else None, reasoning

    async def assist_stream_reply(
            self,
            user_message: str,
            user_name: str | None,
            organization_name: str | None,
    ) -> AsyncGenerator[dict, None]:
        url = f"{self.base_url}/chat"
        payload = {
            "question": user_message,
            "user_name": user_name or "anonymous",
            "organisation_name": organization_name or "default_org",
        }

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
                            continue

                        message_type = raw_event.get("message_type")
                        if message_type == "stream_delta":
                            delta = raw_event.get("delta") or raw_event.get("llm_answer") or ""
                            if delta:
                                yield {"type": "delta", "delta": delta}
                        elif message_type == "stream_end":
                            usage = self._build_usage(raw_event)
                            latency_ms = raw_event.get("latency_ms") or 0.0
                            final_answer = raw_event.get("llm_answer") or ""
                            yield {
                                "type": "complete",
                                "usage": usage,
                                "latency_ms": float(latency_ms),
                                "answer": final_answer,
                            }
                            return
                        await asyncio.sleep(0)
        except httpx.HTTPError as e:
            yield {"type": "error", "error": f"http_error: {str(e)}"}
        except Exception as e:
            yield {"type": "error", "error": f"stream_error: {str(e)}"}


# Module-level singleton cache: avoid re-initialization
_clients: dict[str, LLMClient | MockLLMClient] = {}


def _parse_ollama_options(raw: str | None) -> dict:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _get_ollama_client(model: str) -> LLMClient:
    key = f"ollama:{model}"
    if key not in _clients:
        _clients[key] = LLMClient(
            settings.OLLAMA_BASE_URL,
            model,
            settings.OLLAMA_TIMEOUT,
            _parse_ollama_options(settings.OLLAMA_OPTIONS_JSON),
        )
    return _clients[key]  # type: ignore[return-value]


def _get_mock_client() -> MockLLMClient:
    key = "mock"
    if key not in _clients:
        _clients[key] = MockLLMClient(settings.MOCK_LLM_BASE_URL, settings.OLLAMA_TIMEOUT)
    return _clients[key]  # type: ignore[return-value]


def get_client_for(model_size: str | None) -> tuple[LLMClient | MockLLMClient, str, str]:
    """
    Resolve the requested model preset to a concrete client and model label.

    Returns (client, resolved_model_name, resolved_size)
    """
    normalized_size = (model_size or "default").lower()

    if normalized_size == "default":
        return _get_mock_client(), "mock_llm", "default"

    model_map = {
        "small": settings.OLLAMA_MODEL_SMALL or settings.OLLAMA_MODEL,
        "medium": settings.OLLAMA_MODEL_MEDIUM or settings.OLLAMA_MODEL,
        "large": settings.OLLAMA_MODEL_LARGE or settings.OLLAMA_MODEL,
    }

    resolved_model = model_map.get(normalized_size, settings.OLLAMA_MODEL)
    return _get_ollama_client(resolved_model), resolved_model, normalized_size
