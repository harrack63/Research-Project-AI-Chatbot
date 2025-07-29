import json
import numpy as np
import os
from collections import defaultdict
from scipy.sparse import csr_matrix
from pymilvus import MilvusClient
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from tqdm import tqdm
from dotenv import load_dotenv

load_dotenv()

# Initialize Milvus client and embedding model
milvus_client = MilvusClient(
    uri=os.getenv("MILVUS_URI")
)

embedding_model = OpenAIEmbeddings(
    model=os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
    api_key=os.getenv("OPENAI_API_KEY")
)

def get_embeddings(texts):
    """Generate embeddings for a list of texts"""
    return embedding_model.embed_documents(texts)

def create_milvus_collection(collection_name: str):
    """
    Create a new Milvus collection with specified configuration.
    
    Args:
        collection_name (str): The name of the collection to create.
    """
    embedding_dim = len(embedding_model.embed_query("foo"))
    
    if milvus_client.has_collection(collection_name=collection_name):
        milvus_client.drop_collection(collection_name=collection_name)
    milvus_client.create_collection(
        collection_name=collection_name,
        dimension=embedding_dim,
        consistency_level="Strong",
    )

def load_diabetes_recipes(filename: str = "diabetes_recipes.json") -> list:
    """Load diabetes recipes from JSON file"""
    filepath = os.path.join(os.path.dirname(__file__), '..', 'dataset', filename)
    
    with open(filepath, 'r', encoding='utf-8') as f:
        recipes = json.load(f)
    
    print(f"Loaded {len(recipes)} diabetes recipes")
    return recipes

def format_recipe_for_milvus(recipe: dict) -> dict:
    """
    Format a single recipe for Milvus insertion.
    Uses description as content and all other information as metadata.
    """
    # Use description as the main content for embedding
    content = recipe.get('description', '')
    
    # If no description, create content from name and instructions
    if not content:
        content = f"{recipe.get('name', '')} - " + " ".join(recipe.get('instructions', []))
    
    # Create metadata with all other recipe information
    metadata = {
        "name": recipe.get('name', ''),
        "url": recipe.get('url', ''),
        "tags": recipe.get('tags', []),
        "nutrition_facts": recipe.get('nutrition_facts', {}),
        "ingredients": recipe.get('ingredients', []),
        "instructions": recipe.get('instructions', []),
        "recipe_type": "diabetes_friendly"
    }
    
    return {
        "content": content,
        "metadata": metadata
    }

def upload_diabetes_recipes_to_milvus(collection_name: str = "diabetes_recipes"):
    """
    Upload diabetes recipes to Milvus database.
    Sets description as content and all other information as metadata.
    """
    print(f"Starting upload to collection: {collection_name}")
    
    # Create collection
    create_milvus_collection(collection_name)
    
    # Load recipes
    recipes = load_diabetes_recipes()
    
    # Format documents for Milvus
    documents = []
    for recipe in recipes:
        formatted_recipe = format_recipe_for_milvus(recipe)
        documents.append(formatted_recipe)
    
    # Prepare entities for insertion
    entities = []
    texts = [doc["content"] for doc in documents]
    
    print("Generating embeddings...")
    embeddings = get_embeddings(texts)
    
    print("Preparing data for insertion...")
    for i, doc in enumerate(documents):
        # Create a combined text that includes metadata as searchable content
        metadata = doc.get("metadata", {})
        combined_text = doc["content"]
        
        # Add recipe name and tags to make them searchable
        if metadata.get("name"):
            combined_text = f"Recipe: {metadata['name']}. {combined_text}"
        if metadata.get("tags"):
            combined_text += f" Tags: {', '.join(metadata['tags'])}"
        
        entities.append(
            {
                "id": i,
                "text": combined_text,
                "vector": embeddings[i],
            }
        )
    
    # Insert data in batches
    batch_size = 100
    total_inserted = 0
    
    for i in tqdm(range(0, len(entities), batch_size), desc="Inserting batches"):
        batch = entities[i:i + batch_size]
        milvus_client.insert(collection_name, batch)
        total_inserted += len(batch)
    
    print(f"Successfully inserted {total_inserted} diabetes recipes into collection '{collection_name}'")
    
    return total_inserted

if __name__ == "__main__":
    try:
        result = upload_diabetes_recipes_to_milvus()
        print(f"Upload completed successfully. Total recipes uploaded: {result}")
    except Exception as e:
        print(f"Error during upload: {e}")
        raise