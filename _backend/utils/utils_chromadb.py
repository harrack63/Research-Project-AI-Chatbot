from langchain_chroma import Chroma
from langchain_huggingface.embeddings import HuggingFaceEmbeddings
import json
import os
import argparse
from tqdm import tqdm

from config import VECTORDB_NAME_CHAT_HISTORY


def load_chat_history_to_vectordb_from_json(exp_name: str):
    """
    Load the chat history from the JSON file and add it to the vector store.
    """
    # check if the files exist
    assert os.path.exists(f"out/{exp_name}"), (
        f"Experiment directory not found: out/{exp_name}"
    )

    fp_chat_history = f"out/{exp_name}/chat_history.json"
    assert os.path.exists(fp_chat_history), (
        f"Chat history file not found: {fp_chat_history}"
    )
    with open(fp_chat_history, "r") as f:
        chat_history = json.load(f)["chat_history"]

    if not os.path.exists(f"out/{exp_name}/{VECTORDB_NAME_CHAT_HISTORY}"):
        os.makedirs(f"out/{exp_name}/{VECTORDB_NAME_CHAT_HISTORY}")

    vectordb = Chroma(
        embedding_function=HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2"),
        persist_directory=f"out/{exp_name}/{VECTORDB_NAME_CHAT_HISTORY}",
    )

    # concat the conversation between the user and the assistant
    conversations = []
    for i in range(0, len(chat_history) - 1, 2):
        assert chat_history[i]["role"] == "user"
        assert chat_history[i+1]["role"] == "assistant"
        conversations.append({"role": "conversation", "content": f"{chat_history[i]['role']}: {chat_history[i]['content']}\n{chat_history[i+1]['role']}: {chat_history[i+1]['content']}", "timestamp": chat_history[i]["timestamp"]})

    for conversation in tqdm(conversations):
        vectordb.add_texts(
            [conversation["content"]],
            metadatas=[{"role": conversation["role"], "timestamp": conversation["timestamp"]}],
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
