from typing import Union, List, Dict
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from personalized_chatbot import PersonalizedChatbot

from fastapi.middleware.cors import CORSMiddleware

import logging
from config import LOGGING_CONFIG
import time

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


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest):
    # Start with a default assistant greeting if this is a new conversation
    history = req.messages

    logger.info("Received messages from frontend")
    start_time = time.time()
    if not history or history[0].role != "assistant":
        history = [
            Message(role="assistant", content="Hi! How can I help you today?")
        ] + history

    try:
        chatbot = PersonalizedChatbot(
            exp_name="web_debug", llm_model_name="OpenAI/gpt-4.1-nano"
        )
        reply = chatbot.chat(req.messages[-1].content)
        history.append(Message(role="assistant", content=reply))

        logger.info(
            f"Chatbot returned in {time.time() - start_time:.2f} seconds. Sending response to frontend."
        )
        return {"messages": history}
    except Exception as e:
        history.append(Message(role="assistant", content=f"Error: {e}"))

        logger.error(f"Sending error response to frontend: {e}")
        # raise HTTPException(status_code=500, detail=str(e))
        return {"messages": history}
