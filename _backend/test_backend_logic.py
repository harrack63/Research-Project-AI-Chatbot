import os
from dotenv import load_dotenv
from utils.utils_milvus import MilvusUtil
from langchain_chroma import Chroma
from langchain_huggingface.embeddings import HuggingFaceEmbeddings

# Load env vars
load_dotenv(".env.local")

def test_engines():
    print("--- 1. Testing Milvus (Medical Knowledge) ---")
    try:
        milvus = MilvusUtil() # Will read from env
        
        # Test 1: Hypertension (Mayo Clinic check)
        print("\n[Test: Mayo Clinic - Hypertension]")
        query = "What are the symptoms of hypertension?"
        results = milvus.search_mayo_clinic(query, limit=2)
        if results:
            for i, r in enumerate(results):
                print(f"  Result {i+1} (Score {r.get('score',0):.3f}): {r.get('text', '')[:100]}...")
        else:
            print("  ❌ No results found in Mayo collection.")

        # Test 2: Diabetes Diet (Recipes check)
        print("\n[Test: Diabetes Recipes - Low Carb]")
        query = "I want a low carb chicken dinner"
        results = milvus.search_diabetes_recipes_formatted(query, limit=1)
        print(f"  Result Snippet:\n  {results[:150].replace(chr(10), ' ')}...")
        
    except Exception as e:
        print(f"❌ Milvus Error: {e}")

    print("\n--- 2. Testing ChromaDB (Chat History) ---")
    try:
        # Check specific user folder
        user_exp = "out/debug/vectordb_chat_history" 
        
        if os.path.exists(user_exp):
            embedding_fn = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
            vectordb = Chroma(persist_directory=user_exp, embedding_function=embedding_fn)
            
            query = "What did I say about my medication?"
            docs = vectordb.similarity_search(query, k=1)
            if docs:
                print(f"  Memory Hit: {docs[0].page_content}")
            else:
                print("  Memory empty (Normal for new user).")
        else:
            print(f"  ⚠ Path {user_exp} does not exist yet. Run a chat first.")
            
    except Exception as e:
        print(f"❌ Chroma Error: {e}")

if __name__ == "__main__":
    test_engines()