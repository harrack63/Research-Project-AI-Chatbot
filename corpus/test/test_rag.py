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

entity_col_name = "entity_collection"
relation_col_name = "relation_collection"
passage_col_name = "passage_collection"

query = "What are the symptoms of type 1 diabetes?"

query_ner_list = ["Euler"]
# query_ner_list = ner(query) # In practice, replace it with your custom NER approach

query_ner_embeddings = [
    embedding_model.embed_query(query_ner) for query_ner in query_ner_list
]

top_k = 3

entity_search_res = milvus_client.search(
    collection_name=entity_col_name,
    data=query_ner_embeddings,
    limit=top_k,
    output_fields=["id"],
)

query_embedding = embedding_model.embed_query(query)

passage_search_res = milvus_client.search(
    collection_name=passage_col_name,
    data=[query_embedding],
    limit=top_k,
    output_fields=["text"],
)[0]

print("Passage Search Results:")
for res in passage_search_res:
    print(f"Passage: {res.text}, ID: {res.id}")
