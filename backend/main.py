from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import logging
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
import google.generativeai as genai
import markdown
import re
import tiktoken
from pathlib import Path
from contextlib import asynccontextmanager

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
embedding_model = None
chroma_client = None
collection = None
gemini_model = None

# Configuration
CHROMA_DB_PATH = "./chroma_db"
COLLECTION_NAME = "documents"
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global embedding_model, chroma_client, collection, gemini_model
    
    try:
        # Initialize sentence transformer
        logger.info(f"Loading embedding model: {EMBEDDING_MODEL_NAME}")
        embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        
        # Initialize ChromaDB
        logger.info("Initializing ChromaDB")
        chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        
        # Get or create collection
        try:
            collection = chroma_client.get_collection(name=COLLECTION_NAME)
            logger.info(f"Loaded existing collection: {COLLECTION_NAME}")
        except:
            collection = chroma_client.create_collection(
                name=COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"}
            )
            logger.info(f"Created new collection: {COLLECTION_NAME}")
        
        # Initialize Gemini API (will be configured when API key is provided)
        logger.info("Gemini API will be initialized when API key is provided")
        
        logger.info("All services initialized successfully!")
        
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")

app = FastAPI(title="NotebookLM-like Chatbot API", version="1.0.0", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[dict]] = []

class ChatResponse(BaseModel):
    response: str
    sources: List[dict] = []

class DocumentRequest(BaseModel):
    content: str
    filename: str

class DocumentResponse(BaseModel):
    message: str
    chunks_processed: int

def setup_gemini(api_key: str):
    """Setup Gemini API with provided key"""
    global gemini_model
    try:
        genai.configure(api_key=api_key)
        gemini_model = genai.GenerativeModel('gemini-1.5-flash')
        logger.info("Gemini API configured successfully")
        return True
    except Exception as e:
        logger.error(f"Error configuring Gemini API: {str(e)}")
        return False

def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Split text into overlapping chunks"""
    # Use tiktoken for more accurate token counting
    encoding = tiktoken.get_encoding("cl100k_base")
    tokens = encoding.encode(text)
    
    chunks = []
    start = 0
    
    while start < len(tokens):
        end = start + chunk_size
        chunk_tokens = tokens[start:end]
        chunk_text = encoding.decode(chunk_tokens)
        chunks.append(chunk_text)
        start = end - overlap
        
        if start >= len(tokens):
            break
    
    return chunks

def preprocess_markdown(content: str) -> str:
    """Preprocess markdown content for better chunking"""
    # Convert markdown to plain text while preserving structure
    html = markdown.markdown(content)
    # Remove HTML tags but keep the content
    text = re.sub('<[^<]+?>', '', html)
    # Clean up extra whitespace
    text = re.sub(r'\n\s*\n', '\n\n', text)
    text = re.sub(r' +', ' ', text)
    return text.strip()

@app.get("/")
async def root():
    return {"message": "NotebookLM-like Chatbot API is running!"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "embedding_model": EMBEDDING_MODEL_NAME,
        "collection_count": collection.count() if collection else 0,
        "gemini_configured": gemini_model is not None
    }

@app.post("/configure-gemini")
async def configure_gemini(request: dict):
    """Configure Gemini API key"""
    api_key = request.get("api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required")
    
    success = setup_gemini(api_key)
    if success:
        return {"message": "Gemini API configured successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to configure Gemini API")

@app.post("/upload-document", response_model=DocumentResponse)
async def upload_document(request: DocumentRequest):
    """Process and store document chunks in ChromaDB"""
    try:
        # Preprocess markdown content
        processed_content = preprocess_markdown(request.content)
        
        # Chunk the content
        chunks = chunk_text(processed_content)
        logger.info(f"Created {len(chunks)} chunks from {request.filename}")
        
        # Generate embeddings and store in ChromaDB
        for i, chunk in enumerate(chunks):
            if len(chunk.strip()) < 50:  # Skip very short chunks
                continue
                
            # Generate embedding
            embedding = embedding_model.encode(chunk).tolist()
            
            # Create unique ID
            doc_id = f"{request.filename}_{i}"
            
            # Store in ChromaDB
            collection.add(
                embeddings=[embedding],
                documents=[chunk],
                metadatas=[{
                    "filename": request.filename,
                    "chunk_index": i,
                    "chunk_size": len(chunk)
                }],
                ids=[doc_id]
            )
        
        return DocumentResponse(
            message=f"Successfully processed {request.filename}",
            chunks_processed=len(chunks)
        )
        
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Handle chat requests with RAG"""
    try:
        if gemini_model is None:
            raise HTTPException(status_code=400, detail="Gemini API not configured. Please provide API key first.")
        
        # Generate embedding for the query
        query_embedding = embedding_model.encode(request.message).tolist()
        
        # Search for relevant chunks
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=5,  # Get top 5 most relevant chunks
            include=["documents", "metadatas", "distances"]
        )
        
        # Prepare context from retrieved chunks
        context_chunks = []
        sources = []
        
        if results['documents'] and results['documents'][0]:
            for i, (doc, metadata, distance) in enumerate(zip(
                results['documents'][0], 
                results['metadatas'][0], 
                results['distances'][0]
            )):
                context_chunks.append(doc)
                sources.append({
                    "filename": metadata['filename'],
                    "chunk_index": metadata['chunk_index'],
                    "relevance_score": 1 - distance,  # Convert distance to similarity
                    "preview": doc[:200] + "..." if len(doc) > 200 else doc
                })
        
        # Prepare the prompt with context
        context = "\n\n".join(context_chunks) if context_chunks else "No relevant context found."
        
        # Build conversation history
        conversation_context = ""
        if request.conversation_history:
            for turn in request.conversation_history[-5:]:  # Last 5 turns
                conversation_context += f"User: {turn.get('user', '')}\nAssistant: {turn.get('assistant', '')}\n\n"
        
        prompt = f"""You are a helpful AI assistant that answers questions based on the provided context. 
Use the context below to answer the user's question accurately and comprehensively.

Context:
{context}

Previous conversation:
{conversation_context}

Current question: {request.message}

Instructions:
- Answer based primarily on the provided context
- If the context doesn't contain enough information, say so clearly
- Be precise and cite specific information from the context when possible
- Maintain a helpful and conversational tone
- If asked about technical specifications, provide exact values and details from the context

Answer:"""

        # Get response from Gemini
        response = gemini_model.generate_content(prompt)
        
        return ChatResponse(
            response=response.text,
            sources=sources
        )
        
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

@app.get("/collection-stats")
async def get_collection_stats():
    """Get statistics about the document collection"""
    try:
        count = collection.count()
        
        # Get sample of documents to show what's stored
        if count > 0:
            sample = collection.get(limit=3)
            sample_docs = []
            for i, (doc, metadata) in enumerate(zip(sample['documents'], sample['metadatas'])):
                sample_docs.append({
                    "preview": doc[:200] + "..." if len(doc) > 200 else doc,
                    "filename": metadata['filename'],
                    "chunk_index": metadata['chunk_index']
                })
        else:
            sample_docs = []
        
        return {
            "total_chunks": count,
            "sample_documents": sample_docs
        }
        
    except Exception as e:
        logger.error(f"Error getting collection stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")

@app.delete("/clear-collection")
async def clear_collection():
    """Clear all documents from the collection"""
    try:
        # Delete the collection and recreate it
        chroma_client.delete_collection(name=COLLECTION_NAME)
        global collection
        collection = chroma_client.create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )
        return {"message": "Collection cleared successfully"}
        
    except Exception as e:
        logger.error(f"Error clearing collection: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error clearing collection: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)