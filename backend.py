from typing import Union, List, Dict
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from personalized_chatbot import PersonalizedChatbot

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
        history = [
            Message(role="assistant", content="Hi! How can I help you today?")
        ] + history

    try:
        chatbot = PersonalizedChatbot(
            exp_name="web_debug", llm_model_name="OpenAI/gpt-4.1-nano"
        )
        reply = chatbot.chat(req.messages[-1].content)
        history.append(Message(role="assistant", content=reply))
        return {"messages": history}
    except Exception as e:
        print(f"Error in /chat: {e}")
        history.append(Message(role="assistant", content=f"Error: {e}"))
        return {"messages": history}
        raise HTTPException(status_code=500, detail=str(e))
