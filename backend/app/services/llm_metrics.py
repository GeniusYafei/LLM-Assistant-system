# backend/app/services/llm_metrics.py
import httpx

from app.core.config import settings


async def fetch_success_rate_from_mock() -> float | None:
    """
    Call llm-mock `retry_rate` endpoint to get success rate.
    Return (1 - retry_rate);
    """
    base = str(getattr(settings, "MOCK_LLM_BASE_URL", settings.OLLAMA_BASE_URL)).rstrip("/")
    url = f"{base}/retry_rate"
    try:
        timeout = getattr(settings, "MOCK_LLM_TIMEOUT", settings.OLLAMA_TIMEOUT)
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            retry = float(data.get("retry_rate"))
            sr = max(0.0, min(1.0, 1.0 - retry))
            return sr
    except Exception:
        return None