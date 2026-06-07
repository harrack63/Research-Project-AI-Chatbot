# IMPORTANT

Backend chat flow uses a LangGraph pipeline with explicit mode routing and post-response persona updates.

## Whats currently used
- FastAPI endpoints:
  - POST /api/chat/stream: SSE streaming via Tensorblock/OpenAI-compatible runner
- Mode router: chooses only between `planner` and `chitchat` (extendable via backend mode registry)
- Persona updates:
  - Auto update from user profile-relevant messages
  - Auto update from explicit user confirmation of prior assistant suggestions
  - Manual updates saved from right sidebar persona editor
- Retrieval stack in planner mode: Docker Milvus at `http://127.0.0.1:19530` for chat history, uploaded documents, and knowledge-base sources; Chroma is only a backend fallback if Milvus is unavailable
- Assistant messages can include structured references from the SSE stream and render them under the response

## UploadThing notes
- Frontend uses UploadThing v7 helpers with typed endpoints.
- Route URL is explicitly set to `${basePath}/api/uploadthing` to work with Next `basePath` deployments.
