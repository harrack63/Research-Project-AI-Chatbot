import os
from typing import List, Dict, Any, Optional
from pymilvus import MilvusClient
from langchain_openai import OpenAIEmbeddings
from tqdm import tqdm


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

    def create_collection(self, collection_name: str, drop_if_exists: bool = True) -> bool:
        """
        Create a new Milvus collection.
        
        Args:
            collection_name: Name of the collection to create
            drop_if_exists: Whether to drop existing collection with same name
            
        Returns:
            True if collection was created successfully
        """
        try:
            if self.client.has_collection(collection_name=collection_name):
                if drop_if_exists:
                    self.client.drop_collection(collection_name=collection_name)
                else:
                    return False
            
            self.client.create_collection(
                collection_name=collection_name,
                dimension=self.embedding_dim,
                consistency_level="Strong",
            )
            return True
        except Exception as e:
            raise Exception(f"Failed to create collection {collection_name}: {str(e)}")

    def insert_vectors(
        self, 
        collection_name: str, 
        text_list: List[str], 
        batch_size: int = 512
    ) -> List[int]:
        """
        Insert text data with embeddings into a collection.
        
        Args:
            collection_name: Name of the collection
            text_list: List of text strings to embed and insert
            batch_size: Number of items to process in each batch
            
        Returns:
            List of inserted IDs
        """
        inserted_ids = []
        
        for row_id in tqdm(range(0, len(text_list), batch_size), desc="Inserting"):
            batch_texts = text_list[row_id : row_id + batch_size]
            batch_embeddings = self.embedding_model.embed_documents(batch_texts)

            batch_ids = [row_id + j for j in range(len(batch_texts))]
            batch_data = [
                {
                    "id": id_,
                    "text": text,
                    "vector": vector,
                }
                for id_, text, vector in zip(batch_ids, batch_texts, batch_embeddings)
            ]
            
            self.client.insert(
                collection_name=collection_name,
                data=batch_data,
            )
            inserted_ids.extend(batch_ids)
        
        return inserted_ids

    def delete_vectors(self, collection_name: str, ids: List[int]) -> bool:
        """
        Delete vectors from a collection by IDs.
        
        Args:
            collection_name: Name of the collection
            ids: List of IDs to delete
            
        Returns:
            True if deletion was successful
        """
        try:
            self.client.delete(
                collection_name=collection_name,
                ids=ids
            )
            return True
        except Exception as e:
            raise Exception(f"Failed to delete vectors from {collection_name}: {str(e)}")

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

    def search_vectors_by_embedding(
        self, 
        collection_name: str, 
        query_embedding: List[float], 
        limit: int = 5,
        output_fields: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar vectors using embedding vector.
        
        Args:
            collection_name: Name of the collection to search
            query_embedding: Embedding vector to search with
            limit: Maximum number of results to return
            output_fields: Fields to include in output
            
        Returns:
            List of search results with scores and metadata
        """
        if output_fields is None:
            output_fields = ["text"]
        
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

    def drop_collection(self, collection_name: str) -> bool:
        """
        Drop a collection.
        
        Args:
            collection_name: Name of the collection to drop
            
        Returns:
            True if collection was dropped successfully
        """
        try:
            if self.client.has_collection(collection_name=collection_name):
                self.client.drop_collection(collection_name=collection_name)
                return True
            return False
        except Exception as e:
            raise Exception(f"Failed to drop collection {collection_name}: {str(e)}")

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


def main():
    """
    Test function demonstrating MilvusUtil usage similar to test_rag.py
    """
    import os
    from dotenv import load_dotenv
    
    # Load environment variables from .env file
    load_dotenv()
    
    # Initialize MilvusUtil
    milvus_util = MilvusUtil()
    
    # Collection name for testing
    passage_col_name = "mayo_clinic_passage"
    
    # Test query (same as in test_rag.py)
    query = "What are the symptoms of type 1 diabetes?"
    top_k = 3
    
    print(f"Testing search with query: '{query}'")
    print(f"Collection: {passage_col_name}")
    print(f"Top K results: {top_k}")
    print("-" * 50)
    
    try:
        # Check if collection exists
        if not milvus_util.collection_exists(passage_col_name):
            print(f"Collection '{passage_col_name}' does not exist!")
            print("Available collections:", milvus_util.list_collections())
            return
        
        # Perform search
        search_results = milvus_util.search_vectors(
            collection_name=passage_col_name,
            query_text=query,
            limit=top_k,
            output_fields=["text"]
        )
        
        print("Search Results:")
        for i, result in enumerate(search_results, 1):
            print(f"{i}. ID: {result['id']}, Score: {result['score']:.4f}")
            print(f"   Text: {result['text'][:100]}...")
            print()
        
        # Additional test: List all collections
        print("Available collections:")
        collections = milvus_util.list_collections()
        for collection in collections:
            print(f"- {collection}")
        
        # Test collection statistics
        if collections:
            stats = milvus_util.get_collection_stats(passage_col_name)
            print(f"\nCollection '{passage_col_name}' stats:")
            for key, value in stats.items():
                print(f"  {key}: {value}")
                
    except Exception as e:
        print(f"Error during testing: {str(e)}")


if __name__ == "__main__":
    main()