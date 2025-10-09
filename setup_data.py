import requests
import json
from pathlib import Path

def load_document_to_backend(file_path: str, backend_url: str = "http://localhost:8000"):
    """Load a markdown document into the backend API"""
    
    # Read the markdown file
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
        return False
    
    # Prepare the request
    filename = Path(file_path).name
    data = {
        "content": content,
        "filename": filename
    }
    
    # Send to backend
    try:
        response = requests.post(f"{backend_url}/upload-document", json=data)
        response.raise_for_status()
        
        result = response.json()
        print(f"✅ Successfully loaded {filename}")
        print(f"   Chunks processed: {result['chunks_processed']}")
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend. Make sure the FastAPI server is running on http://localhost:8000")
        return False
    except requests.exceptions.HTTPError as e:
        print(f"❌ HTTP error: {e}")
        print(f"   Response: {response.text}")
        return False
    except Exception as e:
        print(f"❌ Error loading document: {e}")
        return False

def clear_collection(backend_url: str = "http://localhost:8000"):
    """Clear existing collection before loading new data"""
    try:
        response = requests.delete(f"{backend_url}/clear-collection")
        response.raise_for_status()
        result = response.json()
        print(f"✅ {result['message']}")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend. Make sure the FastAPI server is running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error clearing collection: {e}")
        return False

def configure_groq_api(api_key: str, backend_url: str = "http://localhost:8000"):
    """Configure Groq API key in the backend"""
    try:
        response = requests.post(f"{backend_url}/configure-groq", json={"api_key": api_key})
        response.raise_for_status()
        print("✅ Groq API configured successfully")
        return True
    except Exception as e:
        print(f"❌ Error configuring Groq API: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Setting up NotebookLM-like Chatbot")
    print("=" * 50)
    
    # Check if backend is running
    try:
        response = requests.get("http://localhost:8000/health")
        print("✅ Backend is running")
        health = response.json()
        print(f"   Collection count: {health['collection_count']}")
        print(f"   Groq configured: {health['groq_configured']}")
    except:
        print("❌ Backend is not running. Please start it first:")
        print("   python backend/main.py")
        exit(1)
    
    # Configure Groq API key
    print("\n📝 Configuring Groq API...")
    api_key = input("Enter your Groq API key (or press Enter to skip): ").strip()
    if api_key:
        configure_groq_api(api_key)
    else:
        print("⚠️  Skipping Groq configuration. You can configure it later.")
    
    # Clear existing collection first
    print("\n🗑️ Clearing existing collection...")
    if not clear_collection():
        print("⚠️ Failed to clear collection, but continuing anyway...")
    
    # Load multiple documents
    documents_to_load = [
        "./tas2781.md",
        "./tas2783.md",
        "./userguide.md"
    ]
    
    successful_loads = 0
    for doc_file in documents_to_load:
        print(f"\n📚 Loading {Path(doc_file).name}...")
        if Path(doc_file).exists():
            if load_document_to_backend(doc_file):
                successful_loads += 1
        else:
            print(f"❌ File {doc_file} not found in current directory")
    
    print(f"\n✅ Successfully loaded {successful_loads} out of {len(documents_to_load)} documents")
    
    # Show collection stats
    try:
        response = requests.get("http://localhost:8000/collection-stats")
        stats = response.json()
        print(f"\n📊 Collection Statistics:")
        print(f"   Total chunks: {stats['total_chunks']}")
        if stats['sample_documents']:
            print(f"   Sample documents:")
            for doc in stats['sample_documents'][:2]:
                print(f"     - {doc['filename']} (chunk {doc['chunk_index']})")
    except Exception as e:
        print(f"Could not get collection stats: {e}")
    
    print("\n🎉 Setup complete! You can now use the chatbot.")
    print("   Frontend: http://localhost:5173")
    print("   Backend API: http://localhost:8000")
    print("   API Docs: http://localhost:8000/docs")