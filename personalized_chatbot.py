"""
Personalized Chatbot with Object-Oriented Design
START -> (user_msg) -> chat_agent -> update_persona_agent -> END (response)
"""

from langgraph.graph import StateGraph, START, END
from langgraph.types import Command

from langchain_core.tools import tool
from langchain_chroma import Chroma
from langchain_huggingface.embeddings import HuggingFaceEmbeddings
from typing import TypedDict, Literal
import json
import os
from datetime import datetime

from state_persona import PersonaState
from agents import AgentUpdatePersona, AgentChat


class ChatbotState(TypedDict):
    """Schema for chatbot state including persona and chat history."""

    persona: PersonaState
    persona_update_status: Literal["pre_chat", "thinking", "chat_completed"]
    user_msg: str
    assistant_msg: str
    assistant_msg_timestamp: str
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
            exp_name: The experiment name for state persistence
            llm_model_name: The LLM model to use for agents
            debug: Enable debug mode for detailed logging
        """
        print(f"Initializing {self.__class__.__name__} with exp_name: {exp_name}")

        self.debug = debug
        self.debug_counter = 0
        self.exp_name = exp_name

        # Initialize agents
        self.agent_update_persona = AgentUpdatePersona(model_name=llm_model_name)
        self.agent_chat = AgentChat(model_name=llm_model_name)

        self.fp_vectordb = f"out/{self.exp_name}/vectordb"
        # Initialize retrieval components
        self.vectordb = Chroma(
            embedding_function=HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2"),
            persist_directory=self.fp_vectordb,
        )

        # Initialize the conversation graph
        self.graph_agent = self._build_graph()

        # Check whether the experiment directory exists
        if not os.path.exists(f"out/{self.exp_name}"):
            os.makedirs(f"out/{self.exp_name}")

        self.fp_state = f"out/{self.exp_name}/chatbot_state.json"

    def _build_graph(self) -> StateGraph:
        """Build and compile the conversation flow graph."""
        graph = StateGraph(ChatbotState)

        # Add nodes
        graph.add_node("persona_agent", self._agent_persona)
        graph.add_node("chat_agent", self._agent_chat)
        graph.add_node("debug_agent", self._agent_debug)

        # Add edges
        graph.add_edge(START, "chat_agent")
        graph.add_edge("persona_agent", "chat_agent")

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

        # Load existing state or create new one
        if os.path.exists(self.fp_state):
            state = self.load_state(self.fp_state)
        else:
            state = self.create_initial_state()

        # Update state with new message
        state["user_msg"] = user_msg
        state["persona_update_status"] = "pre_chat"

        # Process through the graph
        final_state = self.graph_agent.invoke(state)

        # Save the updated state
        self.save_state(final_state, self.fp_state)

        return final_state

    def _agent_persona(self, state: ChatbotState) -> Command[Literal["chat_agent"]]:
        """
        Agent responsible for updating user persona based on conversation.

        Args:
            state: Current chatbot state

        Returns:
            Command to transition to chat agent or end
        """
        if self.debug:
            self.debug_counter += 1
            print(f"=== {self.debug_counter}: In persona_agent ===")
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

    def _agent_chat(self, state: ChatbotState) -> Command[Literal["persona_agent"]]:
        """
        Agent responsible for generating chat responses.

        Args:
            state: Current chatbot state

        Returns:
            Command to transition back to persona agent
        """
        if self.debug:
            self.debug_counter += 1
            print(f"=== {self.debug_counter}: In chat_agent ===")

        user_msg = state["user_msg"]

        # Catch all the debug commands from the user
        if user_msg.lower().strip().startswith("debug"):
            return Command(goto="debug_agent")

        if state["persona_update_status"] == "pre_chat":
            # Add user message to chat history
            self.vectordb.add_texts(
                [user_msg],
                metadatas=[{"role": "user", "timestamp": datetime.now().isoformat()}],
            )
            state["chat_history"].append(
                {
                    "role": "user",
                    "content": user_msg,
                    "timestamp": datetime.now().isoformat(),
                }
            )
            return Command(
                goto="persona_agent", update={"persona_update_status": "thinking"}
            )

        elif state["persona_update_status"] == "thinking":
            retrieved_context = self.retrieve_context(user_msg)

            # Generate response
            response = self.agent_chat(
                persona=state["persona"],
                user_msg=user_msg,
                chat_history=state["chat_history"],
                retrieved_context=retrieved_context,
            )

            # Record the response to the chat history and vectordb
            self.vectordb.add_texts(
                [response],
                metadatas=[
                    {"role": "assistant", "timestamp": datetime.now().isoformat()}
                ],
            )
            state["chat_history"].append(
                {
                    "role": "assistant",
                    "content": response,
                    "timestamp": datetime.now().isoformat(),
                }
            )
            return Command(
                goto="persona_agent",
                update={
                    "chat_history": state["chat_history"],
                    "persona_update_status": "chat_completed",
                    "assistant_msg": response,
                    "assistant_msg_timestamp": datetime.now().isoformat(),
                },
            )

    def _agent_debug(self, state: ChatbotState) -> Command[Literal["persona_agent"]]:
        """
        Agent responsible for debugging the chatbot.

        Args:
            state: Current chatbot state

        Returns:
            Command to transition back to persona agent
        """
        if self.debug:
            self.debug_counter += 1
            print(f"=== {self.debug_counter}: In agent_debug ===")

        user_msg = state["user_msg"]

        if "retrieve" in user_msg:
            if self.debug:
                print("Debugging retrieve command")
            content_to_retrieve = user_msg[
                user_msg.find("retrieve ") + len("retrieve ") :
            ]
            docs = self.vectordb.similarity_search(content_to_retrieve, k=5)
            assistant_msg = f"Content to retrieve: {content_to_retrieve}"
            assistant_msg += "\n==============\n"
            for doc in docs:
                assistant_msg += (
                    f"\nRetrieved context timestamp: {doc.metadata['timestamp']}"
                )
                assistant_msg += f"\nRetrieved context: {doc.page_content}"
                assistant_msg += "\n==============\n"
            assistant_msg += "End of retrieved context"

            state["assistant_msg"] = assistant_msg
            state["assistant_msg_timestamp"] = datetime.now().isoformat()

    def retrieve_context(self, query: str) -> str:
        """
        Retrieve relevant context from vector store.

        Args:
            query: The user query to search for

        Returns:
            Retrieved context as string
        """
        try:
            docs = self.vectordb.similarity_search(query, k=5)
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
            json_data = json.load(f)

        state = PersonalizedChatbot.create_initial_state()
        state.update(json_data)
        return state

    @staticmethod
    def create_initial_state() -> ChatbotState:
        """
        Create initial state for a new conversation.

        Args:
            user_msg: The user's initial message

        Returns:
            Initial chatbot state
        """
        return ChatbotState(
            persona=PersonaState(),
            persona_update_status="pre_chat",
            user_msg="",
            assistant_msg="",
            assistant_msg_timestamp="",
            chat_history=[],
        )

    def display_chat_history_from_vectordb(self):
        """
        Display the chat history.
        """
        all_data = self.vectordb.get(include=["documents", "metadatas"])

        # Combine documents and metadata and sort by timestamp
        chat_entries = []
        for doc, meta in zip(all_data["documents"], all_data["metadatas"]):
            chat_entries.append(
                {"timestamp": meta["timestamp"], "role": meta["role"], "content": doc}
            )

        # Sort by timestamp
        chat_entries.sort(key=lambda x: x["timestamp"])

        # Print in chronological order
        for entry in chat_entries:
            print(f"\nTimestamp: {entry['timestamp']}")
            print(f"Role: {entry['role']}")
            print(f"Content: {entry['content']}")
            print("-" * 80)


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
