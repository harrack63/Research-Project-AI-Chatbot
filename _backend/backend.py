
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
    userId: Optional[str] = "default_user"


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

@app.post("/api/chat/stream")
async def chat_endpoint_stream(req: ChatRequest):
    """Streaming chat endpoint"""
    logger.info(f"User messages: {[msg.content for msg in req.messages if msg.role == 'user']}")
    
    async def stream_response():
        try:
            # Initialize Chatbot with the specific user ID and GPT-5
            user_id = req.userId or "default_user"
            
            # Use the experiment name logic or map user_id to it
            chatbot = PersonalizedChatbot(
                exp_name=user_id, 
                llm_model_name="Azure/gpt-5", # Swapped to gpt-5
                user_id=user_id
            )
            
            user_msg = req.messages[-1].content
            
            # Call the generator
            # Since chatbot.chat_stream yields tokens (strings), we wrap them in SSE format
            
            # We need to run the blocking generator in a thread to not block the async loop
            # OR iterate it if it was async. chat_stream is sync generator.
            
            q: asyncio.Queue[bytes] = asyncio.Queue()
            SENTINEL = b"__DONE__"

            def pump():
                try:
                    for token in chatbot.chat_stream(user_msg):
                        # Clean token for JSON
                        frame = f"data: {json.dumps({'token': token.strip()})}\n\n".encode('utf-8')
                        q.put_nowait(frame)
                    q.put_nowait(f"data: {json.dumps({'done': True})}\n\n".encode('utf-8'))
                except Exception as e:
                    logger.error(f"Streaming error: {e}")
                    err = f"data: {json.dumps({'error': str(e)})}\n\n".encode('utf-8')
                    q.put_nowait(err)
                finally:
                    q.put_nowait(SENTINEL)

            Thread(target=pump, daemon=True).start()

            while True:
                frame = await q.get()
                if frame is SENTINEL:
                    break
                yield frame
                await asyncio.sleep(0)
            
        except Exception as e:
            logger.error(f"Chat error: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e)})}\n\n".encode("utf-8")
    
    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )