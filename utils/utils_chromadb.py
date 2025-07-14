from langchain_chroma import Chroma
from langchain_huggingface.embeddings import HuggingFaceEmbeddings
import json
import os

def load_chat_history_to_vectordb_from_json(exp_name: str):
    """
    Load the chat history from the JSON file and add it to the vector store.
    """
    # check if the files exist
    assert os.path.exists(f"out/{exp_name}"), (
        f"Experiment directory not found: out/{exp_name}"
    )
    assert os.path.exists(f"out/{exp_name}/chatbot_state.json"), (
        f"Chat history file not found: out/{exp_name}/chatbot_state.json"
    )
    assert os.path.exists(f"out/{exp_name}/vectordb"), (
        f"Vector store directory not found: out/{exp_name}/vectordb"
    )

    vectordb = Chroma(
        embedding_function=HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2"),
        persist_directory=f"out/{exp_name}/vectordb",
    )
    fp_state = f"out/{exp_name}/chatbot_state.json"

    with open(fp_state, "r") as f:
        state = json.load(f)

    for msg in state["chat_history"]:
        vectordb.add_texts(
            [msg["content"]],
            metadatas=[{"role": msg["role"], "timestamp": msg["timestamp"]}],
        )


if __name__ == "__main__":
    load_chat_history_to_vectordb_from_json("debug")
