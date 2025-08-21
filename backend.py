
from typing import Union, List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from chatbot import PersonalizedChatbot

from fastapi.middleware.cors import CORSMiddleware

import logging
from config import LOGGING_CONFIG
import time
import os

logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger(__name__)
logger.info("Initializing backend")

app = FastAPI()

# Include user authentication routes
app.include_router(users_router)

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
def chat_endpoint(req: ChatRequest, current_user = Depends(get_current_user)):
    # Print user information
    user_email = current_user[1] if current_user else "Unknown"
    user_id = current_user[0] if current_user else "Unknown"
    username = current_user[2] if current_user else "Unknown"
    
    logger.info(f"Chat request from User: {username} (ID: {user_id}, Email: {user_email})")
    
    # Print incoming messages
    logger.info(f"User messages: {[msg.content for msg in req.messages if msg.role == 'user']}")
    
    # Start with a default assistant greeting if this is a new conversation
    history = req.messages

    logger.info("Processing chat messages...")
    start_time = time.time()
    if not history or history[0].role != "assistant":
        history = [
            Message(role="assistant", content="Hi! How can I help you today?")
        ] + history

    # TODO: Set user profile
    user_msg = req.messages[-1].content
    if user_msg.lower().startswith("admin"):
        user_profile = user_msg[
            user_msg.find("admin set user") + len("admin set user") :
        ]
        user_profile = user_profile.split()
        user_profile = "_".join(user_profile)
        user_profile = user_profile.lower()
        with open("out/user_profile.txt", "w") as f:
            f.write(user_profile)
        logger.info(f"User profile set to: {user_profile}")
        response = "ADMIN MSG: User profile set to: " + user_profile
        history.append(Message(role="assistant", content=response))
        return {"messages": history}

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
        history.append(Message(role="assistant", content=f"Error: {e}"))

        logger.error(f"Sending error response to frontend: {e}")
        # raise HTTPException(status_code=500, detail=str(e))
        return {"messages": history}
