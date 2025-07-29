import os
import json
from pymilvus import MilvusClient
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

# Initialize clients
milvus_client = MilvusClient(
    uri=os.getenv("MILVUS_URI")
)

embedding_model = OpenAIEmbeddings(
    model=os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
    api_key=os.getenv("OPENAI_API_KEY")
)

def load_original_recipes():
    """Load original recipe data for metadata lookup"""
    filepath = os.path.join(os.path.dirname(__file__), '..', 'dataset', 'diabetes_recipes.json')
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def test_retrieval(query: str, collection_name: str = "diabetes_recipes", top_k: int = 5):
    """
    Test retrieving diabetes recipes from Milvus collection with full metadata
    """
    print(f"Testing query: '{query}'")
    print(f"Collection: {collection_name}")
    print("-" * 60)
    
    # Load original recipes for metadata
    original_recipes = load_original_recipes()
    
    # Generate embedding for the query
    query_embedding = embedding_model.embed_query(query)
    
    # Search in Milvus
    search_results = milvus_client.search(
        collection_name=collection_name,
        data=[query_embedding],
        limit=top_k,
        output_fields=["text", "id"]
    )
    
    # Display results with full metadata
    for i, result in enumerate(search_results[0], 1):
        recipe_id = result['entity']['id']
        similarity_score = result['distance']
        search_text = result['entity']['text']
        
        print(f"Result {i} (Similarity Score: {similarity_score:.4f}):")
        print(f"Recipe ID: {recipe_id}")
        
        # Get original recipe data
        if recipe_id < len(original_recipes):
            recipe = original_recipes[recipe_id]
            
            print(f"Name: {recipe.get('name', 'N/A')}")
            print(f"URL: {recipe.get('url', 'N/A')}")
            print(f"Description: {recipe.get('description', 'N/A')[:150]}...")
            print(f"Tags: {', '.join(recipe.get('tags', []))}")
            
            # Nutrition facts
            nutrition = recipe.get('nutrition_facts', {})
            if nutrition:
                print(f"Nutrition - Calories: {nutrition.get('calories', 'N/A')}, "
                      f"Protein: {nutrition.get('protein', 'N/A')}, "
                      f"Carbs: {nutrition.get('total_carbohydrate', 'N/A')}")
            
            # Ingredients count
            ingredients = recipe.get('ingredients', [])
            print(f"Ingredients ({len(ingredients)}): {', '.join([ing.get('name', '') for ing in ingredients[:3]])}{'...' if len(ingredients) > 3 else ''}")
            
            # Instructions count
            instructions = recipe.get('instructions', [])
            print(f"Instructions: {len(instructions)} steps")
            
        else:
            print("Original recipe data not found")
            
        print(f"Search Text: {search_text[:100]}...")
        print("-" * 60)
    
    return search_results

def test_collection_info(collection_name: str = "diabetes_recipes"):
    """
    Test collection information
    """
    print(f"Collection '{collection_name}' info:")
    
    # Check if collection exists
    if milvus_client.has_collection(collection_name):
        print("✓ Collection exists")
        
        # Get collection stats
        stats = milvus_client.get_collection_stats(collection_name)
        print(f"Collection stats: {stats}")
        
    else:
        print("✗ Collection does not exist")
        print("Available collections:")
        collections = milvus_client.list_collections()
        for col in collections:
            print(f"  - {col}")

def main():
    """
    Run various tests on the diabetes recipes collection
    """
    collection_name = "diabetes_recipes"
    
    # Test collection info
    test_collection_info(collection_name)
    print("\n" + "="*60 + "\n")
    
    # Test queries
    test_queries = [
        "breakfast recipes for diabetes",
        "low carb dinner ideas",
        "chicken recipes with vegetables",
        "recipes with protein and fiber",
        "strawberry recipes"
    ]
    
    for query in test_queries:
        test_retrieval(query, collection_name, top_k=3)
        print("\n" + "="*60 + "\n")

if __name__ == "__main__":
    main()