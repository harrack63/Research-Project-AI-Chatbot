import os
import json
from typing import List, Dict, Any, Optional
from pymilvus import MilvusClient
from langchain_openai import OpenAIEmbeddings
from tqdm import tqdm
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class MilvusUtil:
    def __init__(self, uri: Optional[str] = None, token: Optional[str] = None):
        """
        Initialize Milvus utility with connection parameters.
        
        Args:
            uri: Milvus server URI. If None, reads from MILVUS_URI env var
            token: Milvus token. If None, reads from MILVUS_TOKEN env var
        """
        self.uri = uri or os.getenv("MILVUS_URI")
        self.token = token or os.getenv("MILVUS_TOKEN")
        
        # Initialize client
        if self.token:
            self.client = MilvusClient(uri=self.uri, token=self.token)
        else:
            self.client = MilvusClient(uri=self.uri)
        
        # Initialize embedding model
        self.embedding_model = OpenAIEmbeddings(
            model=os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
        )
        self.embedding_dim = len(self.embedding_model.embed_query("test"))

    def search_vectors(
        self, 
        collection_name: str, 
        query_text: str, 
        limit: int = 5,
        output_fields: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar vectors using text query.
        
        Args:
            collection_name: Name of the collection to search
            query_text: Text query to search for
            limit: Maximum number of results to return
            output_fields: Fields to include in output
            
        Returns:
            List of search results with scores and metadata
        """
        if output_fields is None:
            output_fields = ["text"]
        
        query_embedding = self.embedding_model.embed_query(query_text)
        
        search_results = self.client.search(
            collection_name=collection_name,
            data=[query_embedding],
            limit=limit,
            output_fields=output_fields,
        )[0]
        
        results = []
        for result in search_results:
            result_dict = {
                "id": result.id,
                "score": result.distance,
            }
            # Add output fields to result
            for field in output_fields:
                if hasattr(result, field):
                    result_dict[field] = getattr(result, field)
            results.append(result_dict)
        
        return results

    def list_collections(self) -> List[str]:
        """
        Get list of all collections.
        
        Returns:
            List of collection names
        """
        return self.client.list_collections()

    def collection_exists(self, collection_name: str) -> bool:
        """
        Check if a collection exists.
        
        Args:
            collection_name: Name of the collection to check
            
        Returns:
            True if collection exists
        """
        return self.client.has_collection(collection_name=collection_name)

    def get_collection_stats(self, collection_name: str) -> Dict[str, Any]:
        """
        Get statistics for a collection.
        
        Args:
            collection_name: Name of the collection
            
        Returns:
            Dictionary with collection statistics
        """
        try:
            stats = self.client.get_collection_stats(collection_name=collection_name)
            return stats
        except Exception as e:
            raise Exception(f"Failed to get stats for collection {collection_name}: {str(e)}")

    def search_mayo_clinic(self, query_text: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Search Mayo Clinic passages for relevant information.
        
        Args:
            query_text: Text query to search for
            limit: Maximum number of results to return
            
        Returns:
            List of search results with scores and passage text
        """
        collection_name = "mayo_clinic_passage"
        
        if not self.collection_exists(collection_name):
            raise Exception(f"Mayo Clinic collection '{collection_name}' does not exist")
        
        return self.search_vectors(
            collection_name=collection_name,
            query_text=query_text,
            limit=limit,
            output_fields=["text"]
        )

    def search_diabetes_recipes(self, query_text: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Search diabetes-friendly recipes for relevant information.
        
        Args:
            query_text: Text query to search for (e.g., "breakfast recipes", "low carb")
            limit: Maximum number of results to return
            
        Returns:
            List of search results with scores and recipe text
        """
        collection_name = "diabetes_recipes"
        
        if not self.collection_exists(collection_name):
            raise Exception(f"Diabetes recipes collection '{collection_name}' does not exist")
        
        return self.search_vectors(
            collection_name=collection_name,
            query_text=query_text,
            limit=limit,
            output_fields=["text"]
        )

    def _load_diabetes_recipes_metadata(self) -> List[Dict]:
        """Load original diabetes recipes data for metadata lookup"""
        try:
            # Try multiple possible paths
            possible_paths = [
                os.path.join(os.path.dirname(__file__), '..', 'corpus', 'dataset', 'diabetes_recipes.json'),
                os.path.join(os.path.dirname(__file__), '..', 'dataset', 'diabetes_recipes.json'),
                'corpus/dataset/diabetes_recipes.json',
                'dataset/diabetes_recipes.json'
            ]
            
            for filepath in possible_paths:
                if os.path.exists(filepath):
                    with open(filepath, 'r', encoding='utf-8') as f:
                        return json.load(f)
            
            raise FileNotFoundError("Could not find diabetes_recipes.json file")
        except Exception as e:
            raise Exception(f"Failed to load diabetes recipes metadata: {str(e)}")

    def format_diabetes_recipe_paragraph(self, recipe_data: Dict, similarity_score: float) -> str:
        """
        Format a diabetes recipe result with full instructions, ingredients, and nutrition.
        
        Args:
            recipe_data: Recipe data dictionary
            similarity_score: Similarity score from search
            
        Returns:
            Formatted string with complete recipe details
        """
        name = recipe_data.get('name', 'Unknown Recipe')
        description = recipe_data.get('description', 'No description available.')
        nutrition = recipe_data.get('nutrition_facts', {})
        ingredients = recipe_data.get('ingredients', [])
        instructions = recipe_data.get('instructions', [])
        
        result_parts = []
        
        # Recipe name and description
        result_parts.append(f"**{name}** (Similarity: {similarity_score:.3f})")
        result_parts.append(f"Description: {description}")
        
        # Full nutrition information
        if nutrition:
            result_parts.append("\nNutrition Facts:")
            for key, value in nutrition.items():
                if value:
                    # Format key to be more readable
                    formatted_key = key.replace('_', ' ').title()
                    result_parts.append(f"  {formatted_key}: {value}")
        
        # Complete ingredients list
        if ingredients:
            result_parts.append(f"\nIngredients ({len(ingredients)} total):")
            for i, ingredient in enumerate(ingredients, 1):
                name = ingredient.get('name', 'Unknown ingredient')
                amount_us = ingredient.get('amount_us', '')
                amount_metric = ingredient.get('amount_metric', '')
                
                ingredient_line = f"  {i}. {name}"
                if amount_us:
                    ingredient_line += f" - {amount_us}"
                if amount_metric:
                    ingredient_line += f" ({amount_metric})"
                
                result_parts.append(ingredient_line)
        
        # Complete instructions line by line
        if instructions:
            result_parts.append(f"\nInstructions ({len(instructions)} steps):")
            for i, instruction in enumerate(instructions, 1):
                result_parts.append(f"  {i}. {instruction}")
        
        return "\n".join(result_parts)

    def search_diabetes_recipes_formatted(self, query_text: str, limit: int = 3) -> str:
        """
        Search diabetes recipes and return formatted paragraphs with metadata.
        
        Args:
            query_text: Text query to search for
            limit: Maximum number of results to return
            
        Returns:
            Formatted string with recipe paragraphs
        """
        # Get search results
        search_results = self.search_diabetes_recipes(query_text, limit)
        
        if not search_results:
            return "No diabetes recipes found for your query."
        
        # Load original recipe metadata
        try:
            original_recipes = self._load_diabetes_recipes_metadata()
        except Exception as e:
            return f"Error loading recipe metadata: {str(e)}"
        
        # Format results
        formatted_results = []
        formatted_results.append(f"Found {len(search_results)} diabetes-friendly recipes for '{query_text}':\n")
        
        for i, result in enumerate(search_results, 1):
            recipe_id = result.get('id', -1)
            similarity_score = result.get('score', 0.0)
            
            # Get original recipe data
            if 0 <= recipe_id < len(original_recipes):
                recipe_data = original_recipes[recipe_id]
                paragraph = self.format_diabetes_recipe_paragraph(recipe_data, similarity_score)
                formatted_results.append(f"{i}. {paragraph}")
            else:
                formatted_results.append(f"{i}. Recipe not found in metadata (ID: {recipe_id})")
        
        return "\n\n".join(formatted_results)


def main():
    """
    Test function to demonstrate the MilvusUtil functionality
    """
    print("Testing MilvusUtil functionality...")
    print("=" * 60)
    
    try:
        # Initialize MilvusUtil
        milvus_util = MilvusUtil()
        
        # Test collection listing
        print("1. Available collections:")
        collections = milvus_util.list_collections()
        for collection in collections:
            print(f"   - {collection}")
        print()
        
        # Test Mayo Clinic search
        print("2. Testing Mayo Clinic search:")
        print("-" * 40)
        mayo_query = "diabetes management and blood sugar"
        try:
            mayo_results = milvus_util.search_mayo_clinic(mayo_query, limit=2)
            print(f"Query: '{mayo_query}'")
            for i, result in enumerate(mayo_results, 1):
                print(f"Result {i} (Score: {result.get('score', 0):.3f}):")
                print(f"Text: {result.get('text', 'No text')[:150]}...")
                print()
        except Exception as e:
            print(f"Mayo Clinic search failed: {e}")
        
        # Test diabetes recipes search (raw)
        print("3. Testing diabetes recipes search (raw):")
        print("-" * 40)
        recipe_query = "breakfast low carb"
        try:
            recipe_results = milvus_util.search_diabetes_recipes(recipe_query, limit=2)
            print(f"Query: '{recipe_query}'")
            for i, result in enumerate(recipe_results, 1):
                print(f"Result {i} (ID: {result.get('id', 'N/A')}, Score: {result.get('score', 0):.3f}):")
                print(f"Text: {result.get('text', 'No text')[:100]}...")
                print()
        except Exception as e:
            print(f"Diabetes recipes search failed: {e}")
        
        # Test formatted diabetes recipes search
        print("4. Testing formatted diabetes recipes search:")
        print("-" * 40)
        formatted_query = "chicken dinner recipes"
        try:
            formatted_results = milvus_util.search_diabetes_recipes_formatted(formatted_query, limit=2)
            print(formatted_results)
        except Exception as e:
            print(f"Formatted diabetes recipes search failed: {e}")
        
        print("\n" + "=" * 60)
        print("Testing complete!")
        
    except Exception as e:
        print(f"Error initializing MilvusUtil: {e}")
        print("Make sure your .env file has MILVUS_URI and OPENAI_API_KEY set")


if __name__ == "__main__":
    main()
