"""
START -> (user_msg) -> chat_agent -> update_persona_agent -> END (response)
"""

from langgraph.graph import StateGraph, START, END
from langgraph.types import Command

# from langchain_core.tools import tool
# from langchain.vectorstores import FAISS
# from langchain.embeddings import SentenceTransformerEmbeddings
from typing import TypedDict, Literal
import json
import dotenv
import os
from datetime import datetime

from state_persona import PersonaState
from agents import AgentUpdatePersona, AgentChat


# dotenv.load_dotenv()
# os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")

DEBUG = False
IDX_DEBUG = 0


# Define chatbot state schema (persona plus chat history)
class ChatbotState(TypedDict):
    persona: PersonaState
    chat_history: list  # list[dict], e.g. [{"role": ..., "content": ...}]
    persona_update_status: Literal["pre_chat", "chat_completed"]
    user_msg: str


# --- Helper functions to save/load ChatbotState ---
def save_state(state: ChatbotState, filepath: str):
    """
    Save the ChatbotState (persona and chat_history) to a JSON file.
    """
    with open(filepath, "w", encoding="utf-8") as f:
        # Use default=str for potential datetime, etc. fallback (rare for this dict)
        json.dump(state, f, indent=2, ensure_ascii=False, default=str)


def load_state(filepath: str) -> ChatbotState:
    """
    Load the ChatbotState from a JSON file.
    """
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


# --- Initialize LLM and retrieval components ---
# llm_model_name = "OpenAI/gpt-4.1-nano"
llm_model_name = "gpt-4o-mini"
agent_update_persona = AgentUpdatePersona(model_name=llm_model_name)
agent_chat = AgentChat(model_name=llm_model_name)
# embeddings = SentenceTransformerEmbeddings("all-MiniLM-L6-v2")
# vector_store = FAISS.load_local("healthcare_faiss")


# --- Agent 3: Retrieval tool ---
# @tool
# def retrieval_tool(query: str):
#     docs = vector_store.similarity_search(query, k=3)
#     return "\n".join(d.page_content for d in docs)


# --- Agent 1: Persona Maintainer ---
def persona_agent(state: ChatbotState) -> Command[Literal["chat_agent"]]:
    if DEBUG:
        global IDX_DEBUG
        IDX_DEBUG += 1
        print(f"=== In persona_agent {IDX_DEBUG} ===")
        print(f"persona_update_status: {state['persona_update_status']}")

    if state["persona_update_status"] == "pre_chat":
        user_msg = state["user_msg"]
        response = agent_update_persona(user_msg, state["persona"])
        try:
            updates = json.loads(response)
        except Exception:
            updates = {}
            print(f"Error parsing updates: {response}")
        # update persona dict in place (non-empty dict expected)
        state["persona"].update(updates)

        if DEBUG:
            print("Will go to chat_agent")
        return Command(goto="chat_agent", update={"persona": state["persona"]})
    elif state["persona_update_status"] == "chat_completed":
        last_conversation_history = "\n".join(
            [f"{m['role']}: {m['content']}" for m in state["chat_history"]]
        )
        response = agent_update_persona(last_conversation_history, state["persona"])
        try:
            updates = json.loads(response)
        except Exception:
            updates = {}
        # update persona dict in place (non-empty dict expected)
        state["persona"].update(updates)
        if DEBUG:
            print("Will go to END")
        # return Command(goto=END)


def chat_agent(state: ChatbotState) -> Command[Literal["persona_agent"]]:
    if DEBUG:
        global IDX_DEBUG
        IDX_DEBUG += 1
        print(f"=== In chat_agent {IDX_DEBUG} ===")
        print(f"chat_history: {state['chat_history']}")

    user_msg = state["user_msg"]
    state["chat_history"].append(
        {
            "role": "user",
            "content": user_msg,
            "timestamp": datetime.now().isoformat(),
        }
    )

    response = agent_chat(
        persona=state["persona"],
        user_msg=user_msg,
        retrieved_context="",  # TODO: add retrieval
    )
    state["chat_history"].append(
        {
            "role": "assistant",
            "content": response,
            "timestamp": datetime.now().isoformat(),
        }
    )
    state["persona_update_status"] = "chat_completed"
    # After reply, update persona again based on this response

    if DEBUG:
        print("Will go to persona_agent")

    return Command(
        goto="persona_agent",
        update={
            "chat_history": state["chat_history"],
            "persona_update_status": state["persona_update_status"],
        },
    )


def init_graph():
    graph = StateGraph(ChatbotState)  # Pass the state schema as required
    graph.add_edge(START, "persona_agent")
    graph.add_node("persona_agent", persona_agent)
    graph.add_node("chat_agent", chat_agent)
    # graph.add_edge("persona_agent", "chat_agent")
    # graph.add_edge("chat_agent", "persona_agent")
    # graph.add_edge("persona_agent", END)

    graph_agent = graph.compile()
    return graph_agent


def chat(exp_name: str, user_msg: str) -> ChatbotState:
    if os.path.exists(f"out/{exp_name}/chatbot_state.json"):
        state = load_state(f"out/{exp_name}/chatbot_state.json")
    else:
        state = {
            "persona": PersonaState(),
            "chat_history": [],
            "persona_update_status": "pre_chat",
        }
    state["user_msg"] = user_msg
    state["persona_update_status"] = "pre_chat"
    return state


if __name__ == "__main__":
    # --- Build the graph ---
    graph_agent = init_graph()

    # --- Run the experiment ---
    exp_name = "case_1_hypertension"
    state = chat(
        exp_name,
        "Hi, My hypertension has gotten worse. I want to know what to do. Do you think it is due to your previous health suggestions?",
    )

    final_state = graph_agent.invoke(state)

    # --- Save the results ---
    save_state(final_state, f"out/{exp_name}/chatbot_state.json")

    # --- Print the results ---
    print("Assistant reply:", final_state["chat_history"][-1]["content"])
    print("Final persona:", final_state["persona"])
