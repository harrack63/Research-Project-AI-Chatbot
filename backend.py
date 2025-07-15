from typing import Union, List, Dict
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
from dotenv import load_dotenv

from personalized_chatbot import PersonalizedChatbot

from openai import OpenAI
load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

from fastapi.middleware.cors import CORSMiddleware

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
    if not history or history[0].role != "assistant":
        history = [Message(role="assistant", content="Hi! How can I help you today?")] + history

    if not client.api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not set.")
    try:
        # response = client.chat.completions.create(
        #     model="gpt-4o",
        #     messages=[{"role": m.role, "content": m.content} for m in history],
        # )
        # reply = response.choices[0].message.content
        reply = PersonalizedChatbot().chat(req.messages[-1].content)
        history.append(Message(role="assistant", content=reply))
        return {"messages": history}
    except Exception as e:
        print(f"Error in /chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))
