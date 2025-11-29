from utils.utils_milvus import MilvusUtil
from config import MILVUS_URI

def view_all_users():
    milvus = MilvusUtil(uri=MILVUS_URI)
    
    print(f"👀 Querying all users in 'user_preferences'...")
    
    # query() is like "SELECT * FROM table"
    # filter='user_id != ""' is a hack to say "match everything that has an ID"
    results = milvus.client.query(
        collection_name="user_preferences",
        filter='user_id != ""', 
        output_fields=["user_id", "prefs_json", "tags"] # Fields you want to see
    )
    
    print(f"✅ Found {len(results)} users:\n")
    for user in results:
        print(f"👤 ID: {user['user_id']}")
        print(f"   Tags: {user.get('tags')}")
        print(f"   Prefs: {user.get('prefs_json')}")
        print("-" * 30)

if __name__ == "__main__":
    view_all_users()