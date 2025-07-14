from langchain_chroma import Chroma
from langchain_huggingface.embeddings import HuggingFaceEmbeddings
import json
import os
import argparse
from tqdm import tqdm


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
    if not os.path.exists(f"out/{exp_name}/vectordb"):
        os.makedirs(f"out/{exp_name}/vectordb")

    vectordb = Chroma(
        embedding_function=HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2"),
        persist_directory=f"out/{exp_name}/vectordb",
    )
    fp_state = f"out/{exp_name}/chatbot_state.json"

    with open(fp_state, "r") as f:
        state = json.load(f)

    for msg in tqdm(state["chat_history"]):
        vectordb.add_texts(
            [msg["content"]],
            metadatas=[{"role": msg["role"], "timestamp": msg["timestamp"]}],
        )

    display_chat_history_from_vectordb(vectordb)


def display_chat_history_from_vectordb(vectordb: Chroma):
    """
    Display the chat history.
    """
    all_data = vectordb.get(include=["documents", "metadatas"])

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


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--exp_name", "-n", type=str, default="debug")
    args = parser.parse_args()
    load_chat_history_to_vectordb_from_json(args.exp_name)
