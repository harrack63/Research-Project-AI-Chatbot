"""
Personalized Chatbot with Object-Oriented Design
START -> (user_msg) -> chat_agent -> update_persona_agent -> END (response)
"""

from langgraph.graph import StateGraph, START, END
from langgraph.types import Command

from langchain_chroma import Chroma
from langchain_huggingface.embeddings import HuggingFaceEmbeddings
from typing import TypedDict, Literal
import json
import os
from datetime import datetime
import logging
import functools
import time

from state_persona import PersonaState
from agents import AgentUpdatePersona, AgentChat
from config import VECTORDB_NAME_CHAT_HISTORY, MILVUS_URI
from utils import MilvusUtil

from dotenv import load_dotenv

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") if os.getenv("OPENAI_API_KEY") else None
FORGE_KEY = os.getenv("FORGE_KEY") if os.getenv("FORGE_KEY") else None
assert OPENAI_API_KEY or FORGE_KEY, "Either OPENAI_API_KEY or FORGE_KEY must be set"


class ChatbotState(TypedDict):
    """Schema for chatbot state including persona and chat history."""

    persona: PersonaState
    persona_update_status: Literal["pre_chat", "thinking", "chat_completed"]
    user_msg: str
    user_msg_timestamp: str
    assistant_msg: str
    assistant_msg_timestamp: str


class ChatHistoryEntry(TypedDict):
    """Schema for chat history."""

    role: Literal["user", "assistant"]
    content: str
    timestamp: str


class ChatHistoryState(TypedDict):
    """Schema for chat history."""

    chat_history: list[ChatHistoryEntry]


def log_execution_time(func):
    @functools.wraps(func)
    def wrapper(self, *args, **kwargs):
        start_time = time.time()
        result = func(self, *args, **kwargs)
        end_time = time.time()
        duration = end_time - start_time
        if hasattr(self, "logger"):
            self.logger.info(f"{func.__name__} executed in {duration:.4f} seconds")
        else:
            print(
                f"{func.__name__} executed in {duration:.4f} seconds (no logger found)"
            )
        return result

    return wrapper


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
        llm_model_name: str = "OpenAI/gpt-4.1-nano",
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
        start_time = datetime.now()
        self.debug = debug
        self.debug_counter = 0
        self.exp_name = exp_name

        # Ensure experiment work directory exists before setting up logging
        self.workdir = f"out/{self.exp_name}"
        if not os.path.exists(self.workdir):
            os.makedirs(self.workdir)

        # Set up logging to file
        self.init_logger(workdir=self.workdir)

        # Initialize agents
        if FORGE_KEY:
            llm_runner_name = "Tensorblock"
        else:
            llm_runner_name = "OpenAI"
            if llm_model_name.startswith("OpenAI/"):
                llm_model_name = llm_model_name.split("/")[1]
        self.agent_update_persona = AgentUpdatePersona(
            model=llm_model_name, llm_runner_name=llm_runner_name
        )
        self.agent_chat = AgentChat(
            model=llm_model_name, llm_runner_name=llm_runner_name
        )
        self.logger.info(
            f"Initialized agent_update_persona with model: {self.agent_update_persona.model}; llm_runner: {llm_runner_name}"
        )
        self.logger.info(
            f"Initialized agent_chat with model: {self.agent_chat.model}; llm_runner: {llm_runner_name}"
        )

        # Initialize vector database for chat history
        self.fp_vectordb = f"{self.workdir}/{VECTORDB_NAME_CHAT_HISTORY}"
        self.vectordb = Chroma(
            embedding_function=HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2"),
            persist_directory=self.fp_vectordb,
        )
        self.fp_chat_history = f"{self.workdir}/chat_history.json"

        # # Initialize Milvus Database
        # self.milvus_util = MilvusUtil(uri=MILVUS_URI, token=MILVUS_TOKEN)

        # Initialize the conversation graph
        self.graph_agent = self._build_graph()

        self.fp_state = f"{self.workdir}/chatbot_state.json"

        # Log the initialization
        self.logger.info(
            f"Initialized {self.__class__.__name__} with exp_name: {exp_name} took {(datetime.now() - start_time).total_seconds()} seconds"
        )

    def _build_graph(self) -> StateGraph:
        """Build and compile the conversation flow graph."""

        self.logger.info("Building conversation flow graph.")

        graph = StateGraph(ChatbotState)

        # Add nodes
        graph.add_node("persona_agent", self._agent_persona)
        graph.add_node("chat_agent", self._agent_chat)
        graph.add_node("debug_agent", self._agent_debug)

        # Add edges
        graph.add_edge(START, "chat_agent")

        return graph.compile()

    @log_execution_time
    def chat(self, user_msg: str) -> str:
        """
        Process a chat message and return the updated state.

        Args:
            exp_name: Experiment name for state persistence
            user_msg: The user's message

        Returns:
            Updated chatbot state
        """

        self.logger.info(f"Received user message: {user_msg}")

        # Load existing state and chat history or create new one
        state = self.load()

        # Update state with new message
        state.update(
            {
                "user_msg": user_msg,
                "user_msg_timestamp": datetime.now().isoformat(),
                "persona_update_status": "pre_chat",
            }
        )

        # Process through the graph
        final_state = self.graph_agent.invoke(state)
        self.logger.info("Graph processing complete.")

        # Save the updated state
        self.save(final_state)
        self.logger.debug(f"Final state: {final_state}")

        return final_state["assistant_msg"]

    @log_execution_time
    def _agent_persona(self, state: ChatbotState) -> Command[Literal["chat_agent"]]:
        """
        Agent responsible for updating user persona based on conversation.

        Args:
            state: Current chatbot state

        Returns:
            Command to transition to chat agent or end
        """
        self.debug_counter += 1
        self.logger.info(f"=== {self.debug_counter}: In _agent_persona ===")

        if state["persona_update_status"] == "thinking":
            self.logger.debug("In _agent_persona: persona_update_status: thinking")
            # Update persona before chat
            user_msg = state["user_msg"]
            persona = state["persona"]

            response = self.agent_update_persona(user_msg, persona)

            try:
                updates = json.loads(response)
            except Exception:
                updates = {}
                self.logger.warning(f"Error parsing updates: {response}")

            # Update persona dict in place
            persona.update(updates)

            self.logger.info("Will go to chat_agent")

            return Command(goto="chat_agent", update={"persona": persona})

        elif state["persona_update_status"] == "chat_completed":
            self.logger.debug(
                "In _agent_persona: persona_update_status: chat_completed"
            )
            # Update persona after chat completion
            last_conversation_history = "\n".join(
                [
                    f"{m['role']}: {m['content']}"
                    for m in self.chat_history_state["chat_history"]
                ]
            )
            persona = state["persona"]
            response = self.agent_update_persona(last_conversation_history, persona)

            try:
                updates = json.loads(response)
            except Exception:
                updates = {}
                self.logger.warning(f"Error parsing updates: {response}")

            # Update persona dict in place
            persona.update(updates)

            self.logger.info("Will go to END")

            return Command(goto=END, update={"persona": persona})

        else:
            self.logger.error(
                "In _agent_persona: persona_update_status is not pre_chat or chat_completed"
            )

    @log_execution_time
    def _agent_chat(self, state: ChatbotState) -> Command[Literal["persona_agent"]]:
        """
        Agent responsible for generating chat responses.

        Args:
            state: Current chatbot state

        Returns:
            Command to transition back to persona agent
        """
        self.debug_counter += 1
        self.logger.info(f"=== {self.debug_counter}: In chat_agent ===")

        user_msg = state["user_msg"]
        self.logger.debug("Cancel the persona update prior to chat.")

        # Catch all the debug commands from the user
        if user_msg.lower().strip().startswith("debug"):
            self.logger.info("User issued a debug command. Switching to debug_agent.")
            return Command(
                goto="debug_agent", update={"persona_update_status": "chat_completed"}
            )

        if state["persona_update_status"] == "pre_chat":
            return Command(
                goto="persona_agent", update={"persona_update_status": "thinking"}
            )

        elif state["persona_update_status"] == "thinking":
            retrieved_context = self.retrieve_context(user_msg)

            # Generate response
            response = self.agent_chat(
                persona=state["persona"],
                user_msg=user_msg,
                chat_history=self.chat_history_state["chat_history"],
                retrieved_context=retrieved_context,
            )

            # Record the response to the chat history and vectordb
            messages = [
                {
                    "role": "user",
                    "content": user_msg,
                    "timestamp": state["user_msg_timestamp"],
                },
                {
                    "role": "assistant",
                    "content": response,
                    "timestamp": datetime.now().isoformat(),
                },
            ]
            self._update_chat_history(messages=messages)
            self.logger.info(
                "Added user message and assistant response to chat history and vectordb. Going to persona_agent."
            )

            return Command(
                goto="persona_agent",
                update={
                    "persona_update_status": "chat_completed",
                    "assistant_msg": response,
                    "assistant_msg_timestamp": datetime.now().isoformat(),
                },
            )

    @log_execution_time
    def _agent_debug(self, state: ChatbotState) -> Command[Literal["persona_agent"]]:
        """
        Agent responsible for debugging the chatbot.

        Args:
            state: Current chatbot state

        Returns:
            Command to transition back to persona agent
        """
        self.debug_counter += 1
        self.logger.info(f"=== {self.debug_counter}: In agent_debug ===")

        user_msg = state["user_msg"]

        if "retrieve" in user_msg:
            self.logger.info("Debugging retrieve command")

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

            return Command(
                goto=END,
                update={
                    "assistant_msg": assistant_msg,
                    "assistant_msg_timestamp": datetime.now().isoformat(),
                },
            )
        elif "history" in user_msg:
            self.logger.info("Debugging history command")
            assistant_msg = "History:\n"
            for entry in self.chat_history_state["chat_history"]:
                assistant_msg += f"{entry['role']}: \n{entry['content']}\n\n"
            return Command(
                goto=END,
                update={
                    "assistant_msg": assistant_msg,
                    "assistant_msg_timestamp": datetime.now().isoformat(),
                },
            )
        elif "debug model" in user_msg:
            self.logger.info("Debugging print model name")
            assistant_msg = f"Model name: {self.agent_chat.model}"
            return Command(
                goto=END,
                update={
                    "assistant_msg": assistant_msg,
                    "assistant_msg_timestamp": datetime.now().isoformat(),
                },
            )
        else:
            self.logger.info("Debugging ping command")
            assistant_msg = (
                "Assistant is alive. Response time: "
                f"{(datetime.now() - datetime.fromisoformat(state['user_msg_timestamp'])).total_seconds():.2f} seconds"
            )
            assistant_msg_timestamp = datetime.now().isoformat()
            return Command(
                goto=END,
                update={
                    "assistant_msg": assistant_msg,
                    "assistant_msg_timestamp": assistant_msg_timestamp,
                },
            )

    @log_execution_time
    def _update_chat_history(self, messages: list[dict]) -> None:
        """
        Update the chat history.
        """
        for message in messages:
            self.chat_history_state["chat_history"].append(
                {
                    "role": message["role"],
                    "content": message["content"],
                    "timestamp": message["timestamp"],
                }
            )
        conversation = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
        self.vectordb.add_texts(
            [conversation],
            metadatas=[{"role": "conversation", "timestamp": message["timestamp"]}],
        )

        # self.chat_history_state["chat_history"].append(
        #     {
        #         "role": role,
        #         "content": content,
        #         "timestamp": timestamp,
        #     }
        # )

        # self.vectordb.add_texts(
        #     [content], metadatas=[{"role": role, "timestamp": timestamp}]
        # )

    @log_execution_time
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
            context = "\n".join(d.page_content for d in docs)
            self.logger.debug(
                f"Retrieved context for:\nquery:\n{query}\nretrieved context:\n{context}"
            )
            return context
        except Exception as e:
            self.logger.warning(f"Error in retrieval: {e}")
            return ""

    @log_execution_time
    def save(self, state: ChatbotState | ChatHistoryState) -> None:
        """
        Save the chatbot state and chat history to files.
        """
        self._save_state_to_file(state, self.fp_state)
        self._save_state_to_file(self.chat_history_state, self.fp_chat_history)
        self.logger.info(
            f"Saved state to {self.fp_state} and chat history to {self.fp_chat_history}"
        )

    @log_execution_time
    def load(self) -> ChatbotState:
        """
        Load the chatbot state and chat history from files.
        """
        if not os.path.exists(self.fp_state):
            state = self.create_initial_state()
            self.logger.info(f"Created new state file at {self.fp_state}")
        else:
            state = self._load_state_from_file(self.fp_state)
            self.logger.info(f"Loaded state from {self.fp_state}")

        if not os.path.exists(self.fp_chat_history):
            self.chat_history_state = ChatHistoryState(chat_history=[])
            self.logger.info(f"Created new chat history file at {self.fp_chat_history}")
        else:
            with open(self.fp_chat_history, "r", encoding="utf-8") as f:
                json_data = json.load(f)
            self.chat_history_state = ChatHistoryState(
                chat_history=json_data["chat_history"]
            )

            self.logger.info(f"Loaded chat history from {self.fp_chat_history}")

        return state

    def init_logger(self, workdir: str):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.setLevel(logging.DEBUG)

        debug_log_file = os.path.join(workdir, "chatbot_debug.log")
        info_log_file = os.path.join(workdir, "chatbot_info.log")
        debug_file_handler = logging.FileHandler(
            debug_log_file, mode="a", encoding="utf-8"
        )
        info_file_handler = logging.FileHandler(
            info_log_file, mode="a", encoding="utf-8"
        )
        formatter = logging.Formatter(
            "[%(asctime)s][%(levelname)s][%(name)s] %(message)s"
        )
        debug_file_handler.setFormatter(formatter)
        info_file_handler.setFormatter(formatter)

        debug_file_handler.setLevel(logging.DEBUG)
        info_file_handler.setLevel(logging.INFO)

        # Remove all handlers before adding (avoid duplicate logs)
        if self.logger.hasHandlers():
            self.logger.handlers.clear()
        self.logger.addHandler(debug_file_handler)
        self.logger.addHandler(info_file_handler)

        if self.debug:
            stream_handler = logging.StreamHandler()
            stream_handler.setFormatter(formatter)
            self.logger.addHandler(stream_handler)

    @staticmethod
    def _save_state_to_file(
        state: ChatbotState | ChatHistoryState, filepath: str
    ) -> None:
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
    def _load_state_from_file(filepath: str) -> ChatbotState:
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
    chatbot = PersonalizedChatbot(
        exp_name="debug", llm_model_name="Gemini/models/gemini-2.0-flash", debug=True
    )

    # Run the experiment
    user_message = (
        "Hi, My hypertension has gotten worse. I want to know what to do. "
        "Do you think it is due to your previous health suggestions?"
    )

    assistant_reply = chatbot.chat(user_message)

    # Print results
    print("Assistant reply:", assistant_reply)
    # print("Final persona:", chatbot.state["persona"]

    chatbot.display_chat_history_from_vectordb()


if __name__ == "__main__":
    main()
