from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional, Dict, Any, Union
import logging
import json

from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.models.document import Document, Collection
from app.services.document_processor import DocumentProcessor
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize document processor
document_processor = DocumentProcessor(
    upload_dir=settings.UPLOAD_DIR,
    chroma_db_path=settings.CHROMA_DB_PATH
)

# Pydantic models for request/response validation
class PromptRequest(BaseModel):
    prompt: str = Field(..., description="The prompt to send to the model")
    model: str = Field("gpt-3.5-turbo", description="The model to use")
    temperature: float = Field(0.7, ge=0, le=2, description="Sampling temperature")
    max_tokens: Optional[int] = Field(1000, ge=1, le=4000, description="Max tokens to generate")
    top_p: float = Field(1.0, ge=0, le=1, description="Nucleus sampling parameter")
    frequency_penalty: float = Field(0.0, ge=-2, le=2, description="Frequency penalty")
    presence_penalty: float = Field(0.0, ge=-2, le=2, description="Presence penalty")
    stop: Optional[List[str]] = Field(None, description="Stop sequences")
    document_ids: Optional[List[str]] = Field(None, description="Document IDs for context")
    collection_ids: Optional[List[str]] = Field(None, description="Collection IDs for context")
    system_message: Optional[str] = Field("You are a helpful AI assistant.", description="System message to guide the model's behavior")

class ModelInfo(BaseModel):
    id: str
    name: str
    description: str
    max_tokens: int
    supports_functions: bool
    supports_vision: bool
    supports_tools: bool

class PlaygroundState(BaseModel):
    model: str
    temperature: float
    max_tokens: int
    system_message: str
    recent_prompts: List[Dict[str, Any]] = []

# Available models
AVAILABLE_MODELS = [
    ModelInfo(
        id="gpt-3.5-turbo",
        name="GPT-3.5 Turbo",
        description="Most capable GPT-3.5 model, optimized for chat at 1/10th the cost of text-davinci-003.",
        max_tokens=4096,
        supports_functions=True,
        supports_vision=False,
        supports_tools=True
    ),
    ModelInfo(
        id="gpt-4",
        name="GPT-4",
        description="More capable than any GPT-3.5 model, able to do more complex tasks, and optimized for chat.",
        max_tokens=8192,
        supports_functions=True,
        supports_vision=False,
        supports_tools=True
    ),
    # Add more models as needed
]

# In-memory storage for playground state (in production, use a database)
playground_states = {}

@router.get("/models", response_model=List[ModelInfo])
async def list_available_models():
    """List all available models for the playground"""
    return AVAILABLE_MODELS

@router.get("/models/{model_id}", response_model=ModelInfo)
async def get_model_info(model_id: str):
    """Get information about a specific model"""
    for model in AVAILABLE_MODELS:
        if model.id == model_id:
            return model
    raise HTTPException(status_code=404, detail="Model not found")

@router.post("/completions")
async def create_completion(
    request: PromptRequest,
    session_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Generate a completion using the specified model and parameters
    
    This endpoint provides a playground-like interface for experimenting with
    different models and parameters.
    """
    try:
        # Validate model
        model_info = next((m for m in AVAILABLE_MODELS if m.id == request.model), None)
        if not model_info:
            raise HTTPException(status_code=400, detail=f"Model {request.model} not available")
        
        # Get relevant document context if document_ids or collection_ids are provided
        context = ""
        if request.document_ids or request.collection_ids:
            # This is a simplified implementation - in a real app, you would retrieve
            # and process relevant document chunks here
            context = "[Document context would be retrieved here]"
        
        # Prepare the prompt with context
        full_prompt = f"""{request.system_message}

Context:
{context}

User: {request.prompt}

Assistant:"""
        
        # In a real implementation, you would call the appropriate LLM API here
        # For now, we'll return a mock response
        response = {
            "id": f"cmpl-{str(uuid.uuid4())}",
            "object": "text_completion",
            "created": int(time.time()),
            "model": request.model,
            "choices": [
                {
                    "text": f"This is a mock response to: {request.prompt}",
                    "index": 0,
                    "logprobs": None,
                    "finish_reason": "length"
                }
            ],
            "usage": {
                "prompt_tokens": len(full_prompt.split()),
                "completion_tokens": 20,  # Mock value
                "total_tokens": len(full_prompt.split()) + 20
            }
        }
        
        # Update session state if session_id is provided
        if session_id:
            if session_id not in playground_states:
                playground_states[session_id] = PlaygroundState(
                    model=request.model,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                    system_message=request.system_message
                )
            
            # Add to recent prompts (limit to last 10)
            playground_states[session_id].recent_prompts.insert(0, {
                "prompt": request.prompt,
                "response": response,
                "timestamp": int(time.time())
            })
            playground_states[session_id].recent_prompts = playground_states[session_id].recent_prompts[:10]
        
        return response
        
    except Exception as e:
        logger.error(f"Error in create_completion: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating completion: {str(e)}"
        )

@router.get("/sessions/{session_id}", response_model=PlaygroundState)
async def get_playground_state(session_id: str):
    """Get the current state of a playground session"""
    if session_id not in playground_states:
        raise HTTPException(status_code=404, detail="Session not found")
    return playground_states[session_id]

@router.post("/sessions/{session_id}/reset")
async def reset_playground_session(session_id: str):
    """Reset a playground session"""
    if session_id in playground_states:
        playground_states[session_id] = PlaygroundState(
            model="gpt-3.5-turbo",
            temperature=0.7,
            max_tokens=1000,
            system_message="You are a helpful AI assistant.",
            recent_prompts=[]
        )
    return {"status": "success", "message": "Session reset"}

@router.post("/rag/query")
async def rag_query(
    query: str,
    document_ids: Optional[List[str]] = None,
    collection_ids: Optional[List[str]] = None,
    k: int = 5,
    db: Session = Depends(get_db)
):
    """
    Perform a RAG (Retrieval Augmented Generation) query
    
    This combines document retrieval with LLM generation to provide
    answers based on the provided documents.
    """
    try:
        # First, retrieve relevant document chunks
        search_results = []
        
        if document_ids:
            for doc_id in document_ids:
                doc = db.query(Document).filter(Document.id == doc_id).first()
                if not doc:
                    continue
                    
                # Search within this document
                collection_name = f"doc_{doc_id}"
                try:
                    results = document_processor.search_documents(
                        query=query,
                        collection_name=collection_name,
                        k=k
                    )
                    
                    # Add document context
                    for result in results:
                        result['document_id'] = doc_id
                        result['document_title'] = doc.title
                    
                    search_results.extend(results)
                except Exception as e:
                    logger.warning(f"Error searching document {doc_id}: {e}")
        
        # Sort results by score and take top k
        search_results.sort(key=lambda x: x.get('score', 0), reverse=True)
        top_results = search_results[:k]
        
        # Prepare context for the LLM
        context = "\n\n".join([
            f"Document: {r.get('document_title', 'Unknown')}\n"
            f"Relevance: {r.get('score', 0):.2f}\n"
            f"Content: {r.get('content', '')}"
            for r in top_results
        ])
        
        # Generate a response using the LLM
        # In a real implementation, you would call your LLM here
        response_text = f"""Based on the provided documents, here's what I found:

{context}

Please note that this is a mock response. In a real implementation, this would be generated by an LLM."""
        
        return {
            "query": query,
            "context": context,
            "response": response_text,
            "sources": [
                {
                    "document_id": r.get('document_id'),
                    "document_title": r.get('document_title'),
                    "content": r.get('content'),
                    "score": r.get('score')
                }
                for r in top_results
            ]
        }
        
    except Exception as e:
        logger.error(f"Error in RAG query: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error performing RAG query: {str(e)}"
        )

@router.get("/templates")
async def list_prompt_templates():
    """List available prompt templates"""
    templates = [
        {
            "id": "qa",
            "name": "Question Answering",
            "system_message": "You are a helpful assistant that answers questions based on the provided context.",
            "prompt": "Context: {context}\n\nQuestion: {question}\n\nAnswer:",
            "description": "Template for question answering with context"
        },
        {
            "id": "summarize",
            "name": "Document Summarization",
            "system_message": "You are an AI that summarizes documents concisely.",
            "prompt": "Please summarize the following document:\n\n{document}",
            "description": "Template for summarizing documents"
        },
        # Add more templates as needed
    ]
    return templates

@router.get("/templates/{template_id}")
async def get_prompt_template(template_id: str):
    """Get a specific prompt template by ID"""
    templates = await list_prompt_templates()
    for template in templates:
        if template["id"] == template_id:
            return template
    raise HTTPException(status_code=404, detail="Template not found")
