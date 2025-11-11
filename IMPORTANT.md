# IMPORTANT

Backend currently runs in a simplified, reliable mode for frontend integration. It does NOT fully use LangGraph + Chroma + Milvus yet.

## What works
- FastAPI endpoints:
  - POST /api/chat: single reply via PersonalizedChatbot.chat(...)
  - POST /api/chat/stream: SSE streaming via Tensorblock/OpenAI-compatible runner
- Direct LLM calls (OpenAI or Forge)
- Minimal persistence:
  - out/<profile>/chat_history.json
  - out/<profile>/vectordb_chat_history (Chroma dir created)

## Not fully tested / not production-ready
- LangGraph orchestration (conductor/meal_planner/chitchat/update_history)
  - Routing correctness not guaranteed
- Persona updating
  - LLM output parsing fragile
- Chroma retrieval
  - Exists but not validated under real load/quality
- Milvus integration
  - Requires running Milvus, proper collections/schemas, matching embeddings
  - retrieve_context logs warnings and continues if unavailable

## Why simplified
- To unblock frontend quickly; graph/vector pieces caused runtime instability.
- Code paths remain but are “best effort,” not required.

## Env expectations
- LLM: OPENAI_API_KEY or FORGE_KEY
- Chroma: local filesystem under out/<exp>/vectordb_chat_history
- Milvus (optional): MILVUS_URI (+ MILVUS_TOKEN), prebuilt collections

## Known pitfalls
- Milvus missing/misconfigured → errors/empty context
- Conductor may return unexpected text → fallback to END
- Persona update can fail on malformed LLM output

## Next steps to enable full pipeline
- Stand up Milvus and create required collections with correct schema
- Ensure embedding parity (index = query model)
- Harden LangGraph routing and persona parsing (strict JSON)
- Validate Chroma retrieval quality with real sessions

TL;DR: Backend = direct LLM via FastAPI (works, streaming OK). Graph + Chroma + Milvus present but not fully tested or required yet.