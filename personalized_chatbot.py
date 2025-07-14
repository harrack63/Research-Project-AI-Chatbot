"""
Personalized Chatbot with Object-Oriented Design
START -> (user_msg) -> chat_agent -> update_persona_agent -> END (response)
"""

from langgraph.graph import StateGraph, START, END
from langgraph.types import Command

# from langchain_core.tools import tool
# from langchain.vectorstores import Chroma
# from langchain.embeddings import SentenceTransformerEmbeddings
from typing import TypedDict, Literal, Optional
import json
import os
from datetime import datetime

from state_persona import PersonaState
from agents import AgentUpdatePersona, AgentChat


class ChatbotState(TypedDict):
    """Schema for chatbot state including persona and chat history."""

    persona: PersonaState
    persona_update_status: Literal["pre_chat", "chat_completed"]
    user_msg: str
    chat_history: list  # list[dict], e.g. [{"role": ..., "content": ...}]


class PersonalizedChatbot:
    """
    A personalized chatbot that maintains user persona and provides contextual responses.

    This class encapsulates the entire chatbot functionality including:
    - State management (persona and chat history)
    - Agent coordination (persona updates and chat responses)
    - Retrieval capabilities
    - Graph-based conversation flow
    """

    def __init__(
        self,
        llm_model_name: str = "gpt-4o-mini",
        exp_name: str = "debug",
        debug: bool = False,
    ):
        """
        Initialize the personalized chatbot.

        Args:
            model_name: The LLM model to use for agents
            vector_store_persist_directory: Directory for vector store persistence
            debug: Enable debug mode for detailed logging
        """
        self.debug = debug
        self.debug_counter = 0
        self.exp_name = exp_name

        # Initialize agents
        self.agent_update_persona = AgentUpdatePersona(model_name=llm_model_name)
        self.agent_chat = AgentChat(model_name=llm_model_name)

        # Initialize retrieval components
        # self.embed_func = SentenceTransformerEmbeddings("all-MiniLM-L6-v2")
        # self.vector_store = Chroma(
        #     embedding_function=self.embed_func,
        #     persist_directory=vector_store_persist_directory,
        # )

        # Initialize the conversation graph
        self.graph_agent = self._build_graph()

        # Check whether the experiment directory exists
        if not os.path.exists(f"out/{self.exp_name}"):
            os.makedirs(f"out/{self.exp_name}")

        # Load existing state or create new one
        fp_state = f"out/{self.exp_name}/chatbot_state.json"
        if os.path.exists(fp_state):
            self.state = self.load_state(fp_state)
        else:
            self.state = self.create_initial_state()

    def _build_graph(self) -> StateGraph:
        """Build and compile the conversation flow graph."""
        graph = StateGraph(ChatbotState)

        # Add nodes
        graph.add_node("persona_agent", self._persona_agent)
        graph.add_node("chat_agent", self._chat_agent)

        # Add edges
        graph.add_edge(START, "persona_agent")

        return graph.compile()

    def chat(self, user_msg: str) -> ChatbotState:
        """
        Process a chat message and return the updated state.

        Args:
            exp_name: Experiment name for state persistence
            user_msg: The user's message

        Returns:
            Updated chatbot state
        """

        # Update state with new message
        self.state["user_msg"] = user_msg
        self.state["persona_update_status"] = "pre_chat"

        # Process through the graph
        final_state = self.graph_agent.invoke(self.state)

        # Save the updated state
        self.save_state(final_state, f"out/{self.exp_name}/chatbot_state.json")

        return final_state

    def _persona_agent(self, state: ChatbotState) -> Command[Literal["chat_agent"]]:
        """
        Agent responsible for updating user persona based on conversation.

        Args:
            state: Current chatbot state

        Returns:
            Command to transition to chat agent or end
        """
        if self.debug:
            self.debug_counter += 1
            print(f"=== In persona_agent {self.debug_counter} ===")
            print(f"persona_update_status: {state['persona_update_status']}")

        if state["persona_update_status"] == "pre_chat":
            # Update persona before chat
            user_msg = state["user_msg"]
            response = self.agent_update_persona(user_msg, state["persona"])

            try:
                updates = json.loads(response)
            except Exception:
                updates = {}
                print(f"Error parsing updates: {response}")

            # Update persona dict in place
            state["persona"].update(updates)

            if self.debug:
                print("Will go to chat_agent")
            return Command(goto="chat_agent", update={"persona": state["persona"]})

        elif state["persona_update_status"] == "chat_completed":
            # Update persona after chat completion
            last_conversation_history = "\n".join(
                [f"{m['role']}: {m['content']}" for m in state["chat_history"]]
            )
            response = self.agent_update_persona(
                last_conversation_history, state["persona"]
            )

            try:
                updates = json.loads(response)
            except Exception:
                updates = {}

            # Update persona dict in place
            state["persona"].update(updates)

            if self.debug:
                print("Will go to END")
            # Note: Currently no explicit END transition, but could be added

    def _chat_agent(self, state: ChatbotState) -> Command[Literal["persona_agent"]]:
        """
        Agent responsible for generating chat responses.

        Args:
            state: Current chatbot state

        Returns:
            Command to transition back to persona agent
        """
        if self.debug:
            self.debug_counter += 1
            print(f"=== In chat_agent {self.debug_counter} ===")
            print(f"chat_history: {state['chat_history']}")

        user_msg = state["user_msg"]

        # Add user message to chat history
        state["chat_history"].append(
            {
                "role": "user",
                "content": user_msg,
                "timestamp": datetime.now().isoformat(),
            }
        )

        # Get retrieved context (currently empty, but ready for implementation)
        retrieved_context = self._get_retrieved_context(user_msg)

        # Generate response
        response = self.agent_chat(
            persona=state["persona"],
            user_msg=user_msg,
            chat_history=state["chat_history"],
            retrieved_context=retrieved_context,
        )

        # Add assistant response to chat history
        state["chat_history"].append(
            {
                "role": "assistant",
                "content": response,
                "timestamp": datetime.now().isoformat(),
            }
        )

        state["persona_update_status"] = "chat_completed"

        if self.debug:
            print("Will go to persona_agent")

        return Command(
            goto="persona_agent",
            update={
                "chat_history": state["chat_history"],
                "persona_update_status": state["persona_update_status"],
            },
        )

    def _get_retrieved_context(self, query: str) -> str:
        """
        Retrieve relevant context from vector store.

        Args:
            query: The user query to search for

        Returns:
            Retrieved context as string
        """
        try:
            docs = self.vector_store.similarity_search(query, k=5)
            return "\n".join(d.page_content for d in docs)
        except Exception as e:
            if self.debug:
                print(f"Error in retrieval: {e}")
            return ""

    def get_last_response(self, state: ChatbotState) -> str:
        """
        Get the last assistant response from the chat history.

        Args:
            state: The chatbot state

        Returns:
            The last assistant response
        """
        if state["chat_history"]:
            return state["chat_history"][-1]["content"]
        return ""

    @staticmethod
    def save_state(state: ChatbotState, filepath: str) -> None:
        """
        Save the ChatbotState to a JSON file.

        Args:
            state: The state to save
            filepath: Path to save the state file
        """
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2, ensure_ascii=False, default=str)

    @staticmethod
    def load_state(filepath: str) -> ChatbotState:
        """
        Load the ChatbotState from a JSON file.

        Args:
            filepath: Path to the state file

        Returns:
            Loaded chatbot state
        """
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def create_initial_state() -> ChatbotState:
        """
        Create initial state for a new conversation.

        Args:
            user_msg: The user's initial message

        Returns:
            Initial chatbot state
        """
        return {
            "persona": PersonaState(),
            "chat_history": [],
            "persona_update_status": "pre_chat",
            "user_msg": "",
        }


def main():
    """Main function to demonstrate the chatbot usage."""
    # Initialize the chatbot
    chatbot = PersonalizedChatbot(exp_name="debug", debug=True)

    # Run the experiment
    user_message = (
        "Hi, My hypertension has gotten worse. I want to know what to do. "
        "Do you think it is due to your previous health suggestions?"
    )

    final_state = chatbot.chat(user_message)

    # Print results
    print("Assistant reply:", chatbot.get_last_response(final_state))
    print("Final persona:", final_state["persona"])


if __name__ == "__main__":
    main()
