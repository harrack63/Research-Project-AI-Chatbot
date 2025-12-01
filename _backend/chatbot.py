"""
Personalized Chatbot with Object-Oriented Design
START -> (user_msg) -> chat_agent -> update_persona_agent -> END (response)
"""

from langgraph.graph import StateGraph, START, END
from langgraph.types import Command
# from langgraph.prebuilt import tool

from langchain_chroma import Chroma
from langchain_huggingface.embeddings import HuggingFaceEmbeddings
from typing import TypedDict, Literal, Optional
import json
import os
import numpy as np
from datetime import datetime
import logging
import functools
import time
import queue
import threading
import concurrent.futures

from state_persona import PersonaState
from config import VECTORDB_NAME_CHAT_HISTORY, MILVUS_URI, PROMPTS_DIR
from utils import MilvusUtil, TensorblockClientRunner, OpenAIClientRunner

from dotenv import load_dotenv

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") if os.getenv("OPENAI_API_KEY") else None
FORGE_KEY = os.getenv("FORGE_KEY") if os.getenv("FORGE_KEY") else None
assert OPENAI_API_KEY or FORGE_KEY, "Either OPENAI_API_KEY or FORGE_KEY must be set"

print(f"DEBUG: FORGE_KEY found: {'Yes' if FORGE_KEY else 'No'}")
print(f"DEBUG: OPENAI_API_KEY found: {'Yes' if OPENAI_API_KEY else 'No'}")


class ChatbotState(TypedDict):
    """Schema for chatbot state including persona and chat history."""

    persona: PersonaState
    persona_update_status: Literal["pre_chat", "thinking", "chat_completed"]
    user_msg: str
    user_msg_timestamp: str
    assistant_msg: str
    assistant_msg_timestamp: str
    user_preferences: dict


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
        llm_model_name: str = "gpt-5-mini",
        exp_name: str = "debug",
        debug: bool = False,
        user_id: str = "default_user",
        embedding_function = None
    ):
        """
        Initialize the personalized chatbot.
        """
        start_time = datetime.now()
        self.debug = debug
        self.debug_counter = 0
        self.exp_name = exp_name
        self.llm_model_name = llm_model_name
        self.user_id = user_id
        
        # Streaming control
        self.token_queue = queue.Queue()
        self.is_streaming = False

        # Ensure experiment work directory exists before setting up logging
        self.workdir = f"out/{self.exp_name}"
        if not os.path.exists(self.workdir):
            os.makedirs(self.workdir)

        # Set up logging to file
        self.init_logger(workdir=self.workdir)
        self.logger.info(
            "=" * 10 + f" Initializing {self.__class__.__name__}... " + "=" * 10
        )

        # Initialize agents
        if FORGE_KEY:
            self.logger.info("Using TensorblockClientRunner with FORGE_KEY")
            self.llm_runner = TensorblockClientRunner(model=llm_model_name)
        else:
            self.logger.info("Using OpenAIClientRunner with OPENAI_API_KEY")
            if llm_model_name.startswith("OpenAI/"):
                llm_model_name = llm_model_name.split("/")[1]
            self.llm_runner = OpenAIClientRunner(model=llm_model_name)
        
        # Robust Milvus Init
        self.milvus_util = None
        if MILVUS_URI:
             try:
                self.milvus_util = MilvusUtil(uri=MILVUS_URI)
                self.logger.info("Milvus initialized successfully.")
             except Exception as e:
                self.logger.warning(f"Milvus init failed, continuing without Milvus: {e}")
        

        # Initialize vector database for chat history
        
        # Caches embedding function => increased performance
        if embedding_function is None:
             self.logger.info("No embedding function provided. Loading default.")
             embedding_function = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        self.embedding_function = embedding_function

        load_history_start_time = datetime.now()
        self.fp_vectordb = f"{self.workdir}/{VECTORDB_NAME_CHAT_HISTORY}"
        self.vectordb = Chroma(
            embedding_function=embedding_function,
            persist_directory=self.fp_vectordb,
        )
        self.logger.info(
            f"Loaded vector database for chat history in {(datetime.now() - load_history_start_time).total_seconds():.2f} seconds"
        )
        self.fp_chat_history = f"{self.workdir}/chat_history.json"

        # Initialize the conversation graph
        self.graph_agent = self._build_graph()

        self.fp_state = f"{self.workdir}/chatbot_state.json"
        
        # Define what Nodes like "Meal Planner" and "Chitchat" look like mathematically with anchors (Semantics can be optimized here)
        # Scalable by just adding more key: value pairs to anchors_text
        anchors_text = {
            "meal_planner": "food recipes diet plan hungry cook dinner lunch breakfast nutrition ingredients groceries",
            "chitchat": "hello hi how are you weather who are you random chat greeting general question what's up"
        }
        
        # Pre-calculate embeddings once at startup
        self.route_anchors = {}
        for route, text in anchors_text.items():
            self.route_anchors[route] = self.embedding_function.embed_query(text)
            
        self.logger.info(
            f"Initialized {self.__class__.__name__} with exp_name: {exp_name}"
        )
        self.logger.info(
            f"__init__ executed in {(datetime.now() - start_time).total_seconds():.2f} seconds"
        )
        
        
    # Helper methods    
    def load_preferences(self) -> dict:
        """Fetch user preferences from Milvus."""
        if self.milvus_util:
            try:
                prefs = self.milvus_util.get_user_preferences(self.user_id)
                self.logger.info(f"Loaded preferences for {self.user_id}: {prefs.keys()}")
                return prefs
            except Exception as e:
                self.logger.error(f"Error loading preferences: {e}")
                return {}
        return {}

    def _format_preferences_context(self, prefs: dict) -> str:
        """Format preferences dict into a readable string for the LLM."""
        if not prefs:
            return ""
        
        context = "\n\n=== USER PREFERENCES & PROFILE ===\n"
        if "chatName" in prefs and prefs["chatName"]:
            context += f"Chat/Topic Name: {prefs['chatName']}\n"
        if "personalInfo" in prefs and prefs["personalInfo"]:
            context += f"Personal Info / Constraints: {prefs['personalInfo']}\n"
        context += "==================================\n"
        return context

    def _stream_llm_response(self, messages: list) -> str:
        """Helper to handle LLM streaming to queue and return full string."""
        if self.is_streaming:
            full_response = ""
            # Call runner with stream=True
            response_stream = self.llm_runner(messages, stream=True)
            
            for chunk in response_stream:
                # Handle OpenAI/Tensorblock delta format
                content = None
                if hasattr(chunk.choices[0].delta, "content"):
                    content = chunk.choices[0].delta.content
                
                if content:
                    self.token_queue.put(content)
                    full_response += content
            
            return full_response
        else:
            # Non-streaming fallback
            return self.llm_runner(messages, stream=False)

    @log_execution_time
    def _build_graph(self) -> StateGraph:
        """Build and compile the conversation flow graph."""
        graph = StateGraph(ChatbotState)

        # Add nodes
        graph.add_node("conductor", self._conductor_node)
        graph.add_node("debug", self._debug_node)
        graph.add_node("meal_planner", self._meal_planner_node)
        graph.add_node("chitchat", self._chitchat_node)
        graph.add_node("update_history", self._update_history_node)

        # # Add edges
        graph.add_edge(START, "conductor")
        graph.add_edge("debug", END)
        graph.add_edge("chitchat", "update_history")
        graph.add_edge("meal_planner", "update_history")
        graph.add_edge("update_history", END)
        # graph.add_conditional_edges(
        #     "conductor",
        #     lambda x: x["conductor_decision"],
        #     {
        #         "meal_planner": "meal_planner",
        #         "chitchat": "chitchat",
        #     },
        # )

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
                "assistant_msg": "None",
                "assistant_msg_timestamp": "None",
            }
        )

        # Process through the graph
        final_state = self.graph_agent.invoke(state)
        self.logger.info("-" * 10 + " Graph processing complete. " + "-" * 10)

        # Save the updated state
        self.save(final_state)
        self.logger.debug(f"Final state: {final_state}")

        return final_state["assistant_msg"]
    
    @log_execution_time
    def chat_stream(self, user_msg: str):
        """
        True streaming implementation.
        Runs the graph in a separate thread and uses a Queue to yield tokens
        generated by nodes in real-time.
        """
        self.logger.info(f"Received user message (streaming): {user_msg}")
        
        state = self.load()
        prefs = self.load_preferences() 

        state.update({
            "user_msg": user_msg,
            "user_msg_timestamp": datetime.now().isoformat(),
            "persona_update_status": "pre_chat",
            "assistant_msg": "",
            "assistant_msg_timestamp": datetime.now().isoformat(),
            "user_preferences": prefs, # <--- Store in state
        })

        # Queue to pass tokens from the background thread to this generator
        token_queue = queue.Queue()
        
        # Callback function injected into the graph config
        def stream_callback(token: str):
            token_queue.put(token)

        def run_graph():
            try:
                # Pass the callback via configurable config
                final_state = self.graph_agent.invoke(
                    state, 
                    config={"configurable": {"stream_callback": stream_callback}}
                )
                self.save(final_state)
            except Exception as e:
                self.logger.error(f"Error in graph execution thread: {e}")
                token_queue.put(f"[ERROR: {e}]")
            finally:
                # Sentinel value to signal completion
                token_queue.put(None)

        # Start the graph execution in a separate thread
        t = threading.Thread(target=run_graph)
        t.start()

        # Yield tokens as they appear in the queue
        while True:
            token = token_queue.get()
            if token is None:
                break
            yield token
        
        t.join()
        
    @log_execution_time
    def update_persona(
        self,
        conversation: str,
        current_persona: PersonaState,
    ):
        path_prompts = os.path.join(
            PROMPTS_DIR,
            "update_persona",
        )

        path_prompt = os.path.join(path_prompts, "update_persona_instructions.txt")
        assert os.path.exists(path_prompt)
        with open(path_prompt, "r") as f:
            user_instructions_template = f.read()

        path_system = os.path.join(path_prompts, "update_persona_system.txt")
        assert os.path.exists(path_system)
        with open(path_system, "r") as f:
            system_prompt = f.read()

        with open("state_persona.py", "r") as f:
            persona_state_str = f.read()
        persona_state_str = persona_state_str[
            persona_state_str.find("class PersonaState") :
        ]
        user_prompt = user_instructions_template.format(PersonaState=persona_state_str)
        user_prompt += f"Input text: {conversation}\n"
        user_prompt += f"Current persona: {current_persona}\n"

        messages = [{"role": "system", "content": system_prompt}]
        messages.append({"role": "user", "content": user_prompt})
        response = self.llm_runner(messages, max_tokens=None)

        try:
            current_persona.update(response)
        except Exception as e:
            self.logger.warning(f"Error updating persona: {e}")
            current_persona = current_persona
        return current_persona

    # @log_execution_time
    # def _agent_persona_fast(self, state: ChatbotState) -> Command[Literal["chat_agent"]]:
    #     """
    #     Agent responsible for updating user persona based on conversation.

    #     Args:
    #         state: Current chatbot state

    #     Returns:
    #         Command to transition to chat agent or end
    #     """
    #     self.debug_counter += 1
    #     self.logger.info(f"=== {self.debug_counter}: In _agent_persona_fast ===")

    #     if state["persona_update_status"] == "pre_chat":
    #         self.logger.debug("In _agent_persona_fast: persona_update_status: pre_chat")
    #         # Update persona before chat
    #         user_msg = state["user_msg"]

    #         ls_items = list(state["persona"].keys())
    #         ls_items.sort()
    #         ls_items = ls_items[:-1]

    #         should_update = False
    #         for item in ls_items:
    #             if item in user_msg:
    #                 should_update = True
    #                 break

    #         if should_update:
    #             self.logger.info("Will go to persona_agent")
    #             return Command(goto="persona_agent", update={"persona_update_status": "pre_chat"})
    #         else:
    #             self.logger.info("Will go to chat_agent")
    #             return Command(goto="chat_agent", update={"persona_update_status": "pre_chat"})

    #     else:
    #         self.logger.error(
    #             "In _agent_persona_fast: persona_update_status is not pre_chat"
    #         )

    @log_execution_time
    def _conductor_node(self, state: ChatbotState) -> Command[Literal["debug", "meal_planner", "chitchat"]]: 
                                                    # ^ Add more nodes here as nesseacary (may need to add in config for centralization)
        """
        SCALABLE ROUTER: Checks user input against ALL defined anchors.
        """
        user_msg = state["user_msg"]

        # Debugging
        if user_msg.lower().strip().startswith("debug"):
            return Command(goto="debug", update={"persona_update_status": "chat_completed"})

        # Embed the user's message
        user_vec = self.embedding_function.embed_query(user_msg)

        # Compare against ALL anchors
        scores = {}
        for route, anchor in self.route_anchors.items():
            # Dot product for similarity
            scores[route] = np.dot(user_vec, anchor)
        
        # Log scores
        self.logger.info(f"Routing Scores: {scores}")

        # Pick the winner
        best_route = max(scores, key=scores.get)
        best_score = scores[best_route]

        # Threshold check (e.g., if everything is low, default to chitchat)
        # 0.25 is a common baseline for "somewhat relevant" in cosine similarity
        if best_score < 0.2: 
            self.logger.info(f"Scores too low ({best_score:.3f}), defaulting to chitchat.")
            return Command(goto="chitchat")

        self.logger.info(f"Routing to {best_route} with score {best_score:.3f}")
        
        # NOTE: You must ensure these nodes (therapy, exercise) exist in your graph! 
        # If they don't exist yet, you can map them to a fallback or handle them.
        if best_route not in ["meal_planner", "chitchat"]: 
            # Temporary fallback if you haven't built the 'therapy' node yet
            self.logger.warning(f"Node '{best_route}' not implemented yet. Falling back to chitchat.")
            return Command(goto="chitchat")
            
        return Command(goto=best_route)

    @log_execution_time
    def _debug_node(self, state: ChatbotState):
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
            assistant_msg = "History:\n\n"
            for entry in self.chat_history_state["chat_history"]:
                assistant_msg += f"{entry['role']}: \n\n{entry['content']}\n\n"
                if entry["role"] == "user":
                    assistant_msg += "-" * 80 + "\n\n"
                else:
                    assistant_msg += "=" * 80 + "\n\n"
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
    def _meal_planner_node(self, state: ChatbotState, config: dict) -> str:
        """
        Meal planner node with streaming support.
        """
        self.debug_counter += 1
        self.logger.info(f"=== {self.debug_counter}: In meal_planner ===")

        user_msg = state["user_msg"]
        persona = state["persona"]
        chat_history = self.chat_history_state["chat_history"]
        
        user_prefs = state.get("user_preferences", {})
        prefs_str = json.dumps(user_prefs, indent=2) if user_prefs else "None"
        
        # Check for streaming callback
        stream_callback = config.get("configurable", {}).get("stream_callback")

        if len(chat_history) > 2:
            chat_history_str = "\n".join(
                [f"{m['role']}: {m['content']}" for m in chat_history[-2:]]
            )
        else:
            chat_history_str = ""

        retrieved_context = self.retrieve_context(user_msg)

        # update persona
        self._run_background_persona_update(user_msg, persona)

        # Prepare Prompt (Replicating your logic, keeping it brief here)
        path_prompts = os.path.join(PROMPTS_DIR, "chat")
        with open(os.path.join(path_prompts, "chat_system.txt"), "r") as f:
            system_prompt = f.read()
        
        user_prompt = (
            f"User Preferences (Critical Constraints): {prefs_str}\n"
            f"Full Persona: {persona}\n"
            f"Previous chat history: {chat_history_str}\n"
            f"User Query: {user_msg}\n"
            f"Context from retrieval (if any):\n{retrieved_context}"
        )
        messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]

        # === STREAMING LOGIC ===
        if stream_callback:
            self.logger.info("Streaming meal planner response...")
            response_stream = self.llm_runner(messages, max_tokens=None, stream=True)
            full_response = ""
            for chunk in response_stream:
                if hasattr(chunk.choices[0], 'delta') and hasattr(chunk.choices[0].delta, 'content'):
                    content = chunk.choices[0].delta.content
                    if content:
                        full_response += content
                        stream_callback(content)
            response = full_response
        else:
            response = self.llm_runner(messages, max_tokens=None)

        return Command(goto=END, update={"persona": persona, "assistant_msg": response})

    @log_execution_time
    def _chitchat_node(self, state: ChatbotState, config: dict) -> Command[Literal["update_history"]]:
        """
        Chitchat node with streaming support.
        """
        self.debug_counter += 1
        self.logger.info(f"=== {self.debug_counter}: In chitchat ===")

        user_msg = state["user_msg"]
        persona = state["persona"]
        chat_history = self.chat_history_state["chat_history"]

        # Check for streaming callback
        stream_callback = config.get("configurable", {}).get("stream_callback")

        if len(chat_history) > 2:
            chat_history_str = "\n".join([f"{m['role']}: {m['content']}" for m in chat_history[-2:]])
        else:
            chat_history_str = ""

        retrieved_context = self.retrieve_context(user_msg)
        # update persona
        self._run_background_persona_update(user_msg, persona)

        messages = [
            {
                "role": "system",
                "content": "You are an chatbot assistant. You are given a user message and a persona update status.",
            },
            {
                "role": "user",
                "content": f"Persona: {persona}\nRetrieved context: {retrieved_context}\nChat history: {chat_history_str}\nUser message: {user_msg}\n",
            },
        ]
        
        # === STREAMING LOGIC ===
        if stream_callback:
            self.logger.info("Streaming chitchat response...")
            # Call LLM with stream=True
            response_stream = self.llm_runner(messages, max_tokens=None, stream=True)
            full_response = ""
            
            for chunk in response_stream:
                # Handle OpenAI/Tensorblock chunk format
                if hasattr(chunk.choices[0], 'delta') and hasattr(chunk.choices[0].delta, 'content'):
                    content = chunk.choices[0].delta.content
                    if content:
                        full_response += content
                        stream_callback(content)
            
            response = full_response
        else:
            # Fallback for non-streaming calls
            response = self.llm_runner(messages, max_tokens=None)

        return Command(
            goto="update_history",
            update={
                "persona": persona,
                "assistant_msg": response,
                "assistant_msg_timestamp": datetime.now().isoformat(),
            },
        )

    @log_execution_time
    def _update_history_node(self, state: ChatbotState) -> None:
        """
        Update the chat history.
        """
        user_msg = state["user_msg"]
        user_msg_timestamp = state["user_msg_timestamp"]
        assistant_msg = state["assistant_msg"]
        assistant_msg_timestamp = state["assistant_msg_timestamp"]

        message = {
            "role": "user",
            "content": user_msg,
            "timestamp": user_msg_timestamp,
        }
        self.chat_history_state["chat_history"].append(message)

        message = {
            "role": "assistant",
            "content": assistant_msg,
            "timestamp": assistant_msg_timestamp,
        }
        self.chat_history_state["chat_history"].append(message)

        try:
            conversation = "\n".join(
                [
                    f"{m['role']}: {m['content']}"
                    for m in self.chat_history_state["chat_history"]
                ]
            )
            self.vectordb.add_texts(
                [conversation],
                metadatas=[
                    {"role": "conversation", "timestamp": datetime.now().isoformat()}
                ],
            )
        except Exception as e:
            self.logger.warning(f"Error in update_history: {e}")

    @log_execution_time
    def retrieve_context(self, query: str) -> str:
        """
        Retrieve relevant context from vector store (in parrallel => speed boost for first time to token(FTT)).

        Args:
            query: The user query to search for

        Returns:
            Retrieved context as string
        """
        context = ""
        
        def get_chroma():
            try:
                docs = self.vectordb.similarity_search(query, k=5)
                self.logger.debug(
                    f"Retrieved context for:\nquery:\n{query}\nretrieved context:\n{context}"
                )
                return "\n# Chat History\n" + "\n".join(d.page_content for d in docs)
            except Exception as e:
                self.logger.warning(f"Chroma Error: {e}")
                return ""

        def get_milvus():
            try:
                # Use the existing Milvus util
                if not self.milvus_util: return ""
                
                # Can also parrellelize search on multiple queries if nessecary (future dev)
                search_results = self.milvus_util.search_vectors(
                    collection_name="mayo_clinic_passage", query_text=query, limit=3
                )
                txt = "\n# Diabetes Knowledge Base\n"
                for i, result in enumerate(search_results, 1):
                    context += f"{i}. ID: {result['id']}, Score: {result['score']:.4f}\n"
                    context += f"   Text: {result['text'][:100]}...\n"
                return txt
            except Exception as e:
                self.logger.warning(f"Milvus Error: {e}")
                return ""

        # Execute in parallel
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future_chroma = executor.submit(get_chroma)
            future_milvus = executor.submit(get_milvus)
            
            context += future_chroma.result()
            context += future_milvus.result()

        return context

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
        self.logger = logging.getLogger(__name__)
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
            "[%(levelname)4.4s][%(asctime)s][%(module)s:%(lineno)d] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        debug_file_handler.setFormatter(formatter)
        info_file_handler.setFormatter(formatter)

        debug_file_handler.setLevel(logging.DEBUG)
        info_file_handler.setLevel(logging.INFO)

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

    def _log_execution_time(self, func, *args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        self.logger.info(
            f"{func.__name__} execution time: {end_time - start_time} seconds"
        )
        return result
    
    def _run_background_persona_update(self, user_msg: str, current_persona: PersonaState):
        """
        Runs persona update in a background thread so it doesn't block the chat.
        """
        def task():
            try:
                self.logger.info("Starting background persona update...")
                # 1. Run the heavy LLM call
                # Note: We call the original update logic here, but we don't return it to the main flow
                new_persona_state = self.update_persona(user_msg, current_persona)
                
                # 2. Thread-safe(ish) Save
                # We load the latest state from disk to ensure we don't overwrite 
                # any chat history changes that happened while we were thinking.
                if os.path.exists(self.fp_state):
                    saved_state = self._load_state_from_file(self.fp_state)
                    saved_state['persona'] = new_persona_state
                    self._save_state_to_file(saved_state, self.fp_state)
                    self.logger.info("Background persona update SAVED to disk.")
            except Exception as e:
                self.logger.error(f"Background persona update failed: {e}")

        # Fire and forget
        t = threading.Thread(target=task)
        t.start()


def main():
    """Main function to demonstrate the chatbot usage."""
    # Initialize the chatbot
    chatbot = PersonalizedChatbot(
        exp_name="debug",
        # llm_model_name="Gemini/models/gemini-2.0-flash",
        llm_model_name="OpenAI/gpt-5-mini",
        debug=True,
    )

    # Run the experiment
    # user_message = (
    #     "Hi, My hypertension has gotten worse. I want to know what to do. "
    #     "Do you think it is due to your previous health suggestions?"
    # )
    # user_message = (
    #     "Hi, My hypertension has gotten worse. I want to how to adjust my diet plan. "
    # )
    # user_message = "debug ping"
    user_message = "How's the weather today?"
    # user_message = "Hi, I want to eat McDonald's."

    assistant_reply = chatbot.chat(user_message)

    # Print results
    print("Assistant reply:", assistant_reply)
    # print("Final persona:", chatbot.state["persona"]

    # chatbot.display_chat_history_from_vectordb()


if __name__ == "__main__":
    main()
