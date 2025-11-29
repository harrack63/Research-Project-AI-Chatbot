import json
import numpy as np

from collections import defaultdict
from scipy.sparse import csr_matrix
from pymilvus import MilvusClient
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from tqdm import tqdm

import os
from dotenv import load_dotenv

load_dotenv()

# The `uri` and `token` correspond to the Public Endpoint and Token of your Zilliz Cloud (fully-managed Milvus) cluster.
milvus_client = MilvusClient(
    uri=os.getenv("MILVUS_URI")
)

llm = ChatOpenAI(
    model="OpenAI/gpt-5-mini",
    temperature=0,
    api_key=os.getenv("OPENAI_API_KEY")
)
embedding_model = OpenAIEmbeddings(
    model=os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
    api_key=os.getenv("OPENAI_API_KEY")
)


passages = []

with open("../dataset/mayo_clinic.json", "r", encoding="utf-8") as f:
    dataset = json.load(f)

for passage_id, dataset_info in enumerate(tqdm(dataset)):
    passage, triplets = dataset_info["passage"], dataset_info["triplets"]
    passages.append(passage)

embedding_dim = len(embedding_model.embed_query("foo"))


def create_milvus_collection(collection_name: str):
    """
    Create a new Milvus collection with specified configuration.
    
    This function creates a new Milvus collection for storing vector embeddings.
    If a collection with the same name already exists, it will be dropped first
    to ensure a clean state.
    
    Args:
        collection_name (str): The name of the collection to create.
    """
    if milvus_client.has_collection(collection_name=collection_name):
        milvus_client.drop_collection(collection_name=collection_name)
    milvus_client.create_collection(
        collection_name=collection_name,
        dimension=embedding_dim,
        consistency_level="Strong",
    )


passage_col_name = "mayo_clinic_passage"
create_milvus_collection(passage_col_name)


def milvus_insert(
    collection_name: str,
    text_list: list[str],
):
    """
    Insert text data with embeddings into a Milvus collection in batches.
    
    This function processes a list of text strings, generates embeddings for them,
    and inserts the data into the specified Milvus collection in batches for
    efficient processing.
    
    Args:
        collection_name (str): The name of the Milvus collection to insert data into.
        text_list (list[str]): A list of text strings to be embedded and inserted.
    """
    batch_size = 512
    for row_id in tqdm(range(0, len(text_list), batch_size), desc="Inserting"):
        batch_texts = text_list[row_id : row_id + batch_size]
        batch_embeddings = embedding_model.embed_documents(batch_texts)

        batch_ids = [row_id + j for j in range(len(batch_texts))]
        batch_data = [
            {
                "id": id_,
                "text": text,
                "vector": vector,
            }
            for id_, text, vector in zip(batch_ids, batch_texts, batch_embeddings)
        ]
        milvus_client.insert(
            collection_name=collection_name,
            data=batch_data,
        )

milvus_insert(
    collection_name=passage_col_name,
    text_list=passages,
)