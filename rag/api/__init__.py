"""
Komga RAG API Module

This module provides the FastAPI application and API endpoints for the RAG system.
"""

__version__ = "0.1.0"
__all__ = ["app", "router"]

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
import yaml
import os
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Komga RAG API",
    description="Retrieval-Augmented Generation API for Komga",
    version=__version__,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Router
router = APIRouter()

# Models
class Document(BaseModel):
    id: str
    text: str
    metadata: Optional[Dict[str, Any]] = None

class SearchQuery(BaseModel):
    query: str
    limit: int = 5
    score_threshold: Optional[float] = 0.7
    filter_metadata: Optional[Dict[str, Any]] = None

class SearchResult(Document):
    score: float

class ProcessRequest(BaseModel):
    file_path: str
    metadata: Optional[Dict[str, Any]] = None
    force_reprocess: bool = False

class ProcessResponse(BaseModel):
    document_id: str
    status: str
    chunks_processed: int
    processing_time: float

class HealthCheck(BaseModel):
    status: str
    version: str
    database_status: str
    uptime: float

# Routes
@router.get("/health", response_model=HealthCheck, tags=["System"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": __version__,
        "database_status": "connected",
        "uptime": 0.0,  # Would be calculated in a real implementation
    }

@router.post("/documents", response_model=ProcessResponse, tags=["Documents"])
async def process_document(request: ProcessRequest):
    """Process a document and add it to the vector store."""
    # Implementation would go here
    return {
        "document_id": "doc_123",
        "status": "processed",
        "chunks_processed": 10,
        "processing_time": 1.5,
    }

@router.get("/documents/{document_id}", response_model=Document, tags=["Documents"])
async def get_document(document_id: str):
    """Get a document by ID."""
    # Implementation would go here
    return {
        "id": document_id,
        "text": "Sample document content",
        "metadata": {"source": "example.pdf"},
    }

@router.delete("/documents/{document_id}", status_code=204, tags=["Documents"])
async def delete_document(document_id: str):
    """Delete a document from the vector store."""
    # Implementation would go here
    return None

@router.post("/search", response_model=List[SearchResult], tags=["Search"])
async def search(query: SearchQuery):
    """Search for documents."""
    # Implementation would go here
    return [
        {
            "id": "doc_123",
            "text": "Relevant document content",
            "metadata": {"source": "example.pdf"},
            "score": 0.95,
        }
    ]

@router.get("/themes", response_model=List[Dict[str, Any]], tags=["Analysis"])
async def analyze_themes(
    document_id: Optional[str] = None,
    text: Optional[str] = None,
    min_confidence: float = 0.7,
):
    """Analyze themes in a document or text."""
    # Implementation would go here
    return [
        {
            "theme": "artificial intelligence",
            "confidence": 0.92,
            "mentions": ["AI is transforming...", "Machine learning algorithms..."],
        }
    ]

# Include the router
app.include_router(router, prefix="/api/v1")

# Error handlers
@app.exception_handler(Exception)
async def handle_exception(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# Load configuration
def load_config(config_path: str = "config.yaml") -> Dict[str, Any]:
    """Load configuration from YAML file."""
    config_path = Path(config_path)
    if not config_path.exists():
        logger.warning(f"Config file {config_path} not found, using defaults")
        return {}
    
    with open(config_path, "r") as f:
        return yaml.safe_load(f)

# Initialize the application
def create_app(config_path: str = None) -> FastAPI:
    """Create and configure the FastAPI application."""
    # Load configuration
    config = load_config(config_path)
    
    # Initialize services
    # TODO: Initialize RAG service, database connections, etc.
    
    return app

# For development
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
