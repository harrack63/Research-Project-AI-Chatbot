# IMPORTANT

Backend currently runs in a simplified, reliable mode for frontend integration. It does NOT fully use LangGraph + Chroma + Milvus yet.

## Whats currently used
- FastAPI endpoints:
  - POST /api/chat/stream: SSE streaming via Tensorblock/OpenAI-compatible runner
- Direct LLM calls (OpenAI or Forge)
