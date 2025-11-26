
from typing import Union, List
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from utils.utils_milvus import MilvusUtil
from config import MILVUS_URI

from utils.utils_openai import OpenAIClientRunner
from utils.utils_tensorblock import TensorblockClientRunner
from chatbot import FORGE_KEY, PersonalizedChatbot

from fastapi.middleware.cors import CORSMiddleware

import logging
from config import LOGGING_CONFIG
import time
import os

from fastapi.responses import StreamingResponse
import json

import asyncio
from threading import Thread

logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger(__name__)
logger.info("Initializing backend")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, set this to your frontend's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UserPreferences(BaseModel):
    user_id: str
    chatName: str
    personalInfo: str

class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]


class ChatResponse(BaseModel):
    messages: List[Message]


@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/api/user/preferences")
def save_user_preferences(prefs: UserPreferences):
    """
    Save user preferences (chatName, personalInfo) into Milvus.
    Uses Zilliz Cloud / local Milvus via MilvusUtil.
    """

    try:
        # Determine user identifier
        # You can switch this to Clerk email later using get_current_user()
        user_id =prefs.user_id

        # Prepare preference dict
        pref_dict = {
            "chatName": prefs.chatName,
            "personalInfo": prefs.personalInfo,
        }

        # Tags optional — for now using empty list
        tags = []
        tags_str = ",".join(tags) if tags else ""

        # Save into Milvus
        milvus = MilvusUtil(uri=MILVUS_URI)
        milvus.upsert_user_preferences(
            user_id=user_id,
            preferences=pref_dict,
            tags=tags_str,
        )

        return {"ok": True, "message": "Preferences saved to Milvus"}

    except Exception as e:
        logger.error(f"Failed to save user preferences: {e}")
        return {"ok": False, "error": str(e)}

@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest,):
    
    # Print incoming messages
    logger.info(f"User messages: {[msg.content for msg in req.messages if msg.role == 'user']}")
    
    # Start with a default assistant greeting if this is a new conversation
    history = req.messages

    logger.info("Processing chat messages...")
    start_time = time.time()

    try:
        # ## Set user profile
        user_profile = "web_debug"
        if os.path.exists("out/user_profile.txt"):
            with open("out/user_profile.txt", "r") as f:
                user_profile = f.read()
        logger.info(f"Using user profile: {user_profile}")

        chatbot = PersonalizedChatbot(
            exp_name=user_profile, llm_model_name="Azure/gpt-4o"
        )
        reply = chatbot.chat(req.messages[-1].content)
        history.append(Message(role="assistant", content=reply))

        logger.info(
            f"Chatbot returned in {time.time() - start_time:.2f} seconds. Sending response to frontend."
        )
        return {"messages": history}
    except Exception as e:
        import traceback
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        history.append(Message(role="assistant", content=f"Error: {e}"))

        logger.error(f"Sending error response to frontend: {e}")
        # raise HTTPException(status_code=500, detail=str(e))
        return {"messages": history}

# Fake streaming endpoint for testing
@app.post("/api/chat/stream")
async def chat_endpoint_stream(req: ChatRequest):
    """Streaming chat endpoint using PersonalizedChatbot Graph"""
    logger.info(
      f"User messages: {[msg.content for msg in req.messages if msg.role == 'user']}"
    )
    
    async def stream_response():
        try:
            # 1. Setup User Profile & Initialize Chatbot (Same as /api/chat)
            user_profile = "web_debug"
            if os.path.exists("out/user_profile.txt"):
                with open("out/user_profile.txt", "r") as f:
                    user_profile = f.read()
            
            logger.info(f"Using user profile: {user_profile}")
            
            # Initialize the Graph Bot
            chatbot = PersonalizedChatbot(
                exp_name=user_profile, llm_model_name="Azure/gpt-4o"
            )
            
            user_msg = req.messages[-1].content
            logger.info(f"User message: {user_msg}")

            # 2. Setup Queue for Thread Communication
            q: asyncio.Queue[bytes] = asyncio.Queue()
            SENTINEL = b"__DONE__"

            # 3. Define the pump function (runs in thread)
            def pump():
                try:
                    # Optional: send a prelude
                    q.put_nowait(b": keep-alive\n\n")
                    
                    # Call the chatbot graph's stream method
                    # This method yields strings (tokens), not OpenAI chunk objects
                    # This won't stream unless the custom LLM is modified, but we keep the structure for future use
                    stream_generator = chatbot.chat_stream(user_msg)
                    
                    for token in stream_generator:
                        # Format string token into SSE JSON
                        if token:
                            frame = f"data: {json.dumps({'token': token})}\n\n".encode('utf-8')
                            q.put_nowait(frame)
                            
                    # Send done signal
                    q.put_nowait(f"data: {json.dumps({'done': True})}\n\n".encode('utf-8'))
                    
                except Exception as e:
                    logger.error(f"Stream Pump Error: {e}")
                    err = f"data: {json.dumps({'error': str(e)})}\n\n".encode('utf-8')
                    q.put_nowait(err)
                finally:
                    q.put_nowait(SENTINEL)

            # 4. Start the thread
            # We use a thread because the graph might be blocking/sync
            Thread(target=pump, daemon=True).start()

            # 5. Async generator yielding frames from the queue
            while True:
                frame = await q.get()
                if frame is SENTINEL:
                    break
                yield frame
                await asyncio.sleep(0)
            
        except Exception as e:
            logger.error(f"Chat setup error: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e)})}\n\n".encode("utf-8")
    
    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream; charset=utf-8",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )