"""Very lightweight, local RAG helper for ESG reference texts.

The project uses Ollama-hosted models (gemma3:1b, gemma3:4b, qwen3:4b).
This module offers a small, dependency-free retriever that surfaces the
most relevant sentences from the provided 2023/2024 ESG summaries and
injects them into the LLM system prompt.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Iterable

from app.services import rag_corpus


@dataclass
class ContextChunk:
    source: str
    content: str


@dataclass
class RetrievedContext:
    text: str
    sources: list[str]


def _tokenize(text: str) -> list[str]:
    """Crude tokenizer that keeps CJK characters and words longer than 1."""

    raw_tokens = re.findall(r"[\w\u4e00-\u9fff]+", text.lower())
    tokens: list[str] = []

    for tok in raw_tokens:
        if not tok:
            continue
        # For CJK-heavy tokens, also split into single characters so that
        # short Chinese questions still overlap with the reference lines.
        if re.search(r"[\u4e00-\u9fff]", tok):
            tokens.extend([ch for ch in tok if ch.strip()])
            if len(tok.strip()) > 1:
                tokens.append(tok)
        elif len(tok.strip()) > 1:
            tokens.append(tok)

    return tokens



def _chunk_lines(source: str, text: str) -> list[ContextChunk]:
    """Split the provided text into lightweight sentence/line chunks."""

    chunks: list[ContextChunk] = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        chunks.append(ContextChunk(source=source, content=line))
    return chunks


def _build_corpus() -> list[ContextChunk]:
    base: list[ContextChunk] = []
    base.extend(_chunk_lines("ESG 2023", rag_corpus.ESG_2023_TEXT))
    base.extend(_chunk_lines("ESG 2024", rag_corpus.ESG_2024_TEXT))
    return base


RAG_CORPUS: list[ContextChunk] = _build_corpus()


def _similarity(query: str, chunk: ContextChunk) -> float:
    query_tokens = _tokenize(query)
    chunk_tokens = _tokenize(chunk.content)

    overlap = 0.0
    if query_tokens and chunk_tokens:
        overlap = len(set(query_tokens) & set(chunk_tokens)) / len(set(query_tokens))

    ratio = SequenceMatcher(None, query, chunk.content).ratio()
    return (overlap * 0.7) + (ratio * 0.3)


def _top_chunks(query: str, *, limit: int = 16, min_score: float = 0.05) -> list[ContextChunk]:
    scored: list[tuple[float, ContextChunk]] = []
    for chunk in RAG_CORPUS:
        score = _similarity(query, chunk)
        if score >= min_score:
            scored.append((score, chunk))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [chunk for _, chunk in scored[:limit]]


def _merge_sources(chunks: Iterable[ContextChunk]) -> list[str]:
    seen = dict.fromkeys([chunk.source for chunk in chunks])
    return list(seen.keys())


def build_context_for_query(query: str) -> RetrievedContext | None:
    """Return concatenated context text and the list of source labels."""

    clean_query = (query or "").strip()
    if not clean_query:
        return None

    best = _top_chunks(clean_query)
    if not best:
        fallback_lines = [f"[{chunk.source}] {chunk.content}" for chunk in RAG_CORPUS]
        fallback_sources = _merge_sources(RAG_CORPUS)
        return RetrievedContext(text="\n".join(fallback_lines), sources=fallback_sources)

    context_lines = [f"[{chunk.source}] {chunk.content}" for chunk in best]
    merged_sources = _merge_sources(best)
    return RetrievedContext(text="\n".join(context_lines), sources=merged_sources)

