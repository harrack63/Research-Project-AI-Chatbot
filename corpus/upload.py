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

os.environ["OPENAI_API_KEY"] = "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"


# The `uri` and `token` correspond to the Public Endpoint and Token of your Zilliz Cloud (fully-managed Milvus) cluster.
milvus_client = MilvusClient(
    uri="https://in03-260dfcb4a658d19.serverless.gcp-us-west1.cloud.zilliz.com", 
    token="fd63101c860c8dd08740726b1841aabc88aa93fac2f3c7d4b7bef38771d64f3ea4cbf0c4ed0374ce78aca750ed7a563fed6e638f"
)

llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0,
)
embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")


entityid_2_relationids = defaultdict(list)
relationid_2_passageids = defaultdict(list)

entities = []
relations = []
passages = []

with open("dataset/mayo_clinic.json", "r", encoding="utf-8") as f:
    dataset = json.load(f)

for passage_id, dataset_info in enumerate(tqdm(dataset)):
    passage, triplets = dataset_info["passage"], dataset_info["triplets"]
    passages.append(passage)
    for triplet in triplets:
        if triplet[0] not in entities:
            entities.append(triplet[0])
        if triplet[2] not in entities:
            entities.append(triplet[2])
        relation = " ".join(triplet)
        if relation not in relations:
            relations.append(relation)
            entityid_2_relationids[entities.index(triplet[0])].append(
                len(relations) - 1
            )
            entityid_2_relationids[entities.index(triplet[2])].append(
                len(relations) - 1
            )
        relationid_2_passageids[relations.index(relation)].append(passage_id)

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


entity_col_name = "entity_collection"
relation_col_name = "relation_collection"
passage_col_name = "passage_collection"
create_milvus_collection(entity_col_name)
create_milvus_collection(relation_col_name)
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
    collection_name=relation_col_name,
    text_list=relations,
)

milvus_insert(
    collection_name=entity_col_name,
    text_list=entities,
)

milvus_insert(
    collection_name=passage_col_name,
    text_list=passages,
)