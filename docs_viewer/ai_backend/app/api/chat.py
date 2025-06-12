from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any, AsyncGenerator
import json
import logging

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.document import Document, Collection
from app.services.document_processor import DocumentProcessor
from app.core.config import settings
from langchain.llms import OpenAI, HuggingFaceHub
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize document processor
document_processor = DocumentProcessor(
    upload_dir=settings.UPLOAD_DIR,
    chroma_db_path=settings.CHROMA_DB_PATH
)

# Initialize LLM
if settings.LLM_PROVIDER == "openai" and settings.OPENAI_API_KEY:
    llm = OpenAI(
        temperature=0.7,
        openai_api_key=settings.OPENAI_API_KEY,
        model_name="gpt-3.5-turbo"
    )
elif settings.LLM_PROVIDER == "huggingface" and settings.HUGGINGFACE_API_KEY:
    llm = HuggingFaceHub(
        repo_id="google/flan-t5-xxl",
        huggingfacehub_api_token=settings.HUGGINGFACE_API_KEY
    )
else:
    # Fallback to a local model or raise an error
    raise ValueError("No valid LLM provider configured")

# Chat history storage (in production, use a proper database)
chat_history = {}

# Custom prompt template
QA_PROMPT = PromptTemplate(
    template="""You are an AI assistant helping with document analysis. Use the following pieces of context to answer the question at the end. 
    If you don't know the answer, just say that you don't know, don't try to make up an answer.
    
    Context: {context}
    
    Question: {question}
    
    Helpful Answer:""",
    input_variables=["context", "question"]
)

@router.post("/query")
async def chat_with_document(
    query: str,
    document_id: Optional[str] = None,
    collection_id: Optional[str] = None,
    chat_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Chat with a document or collection of documents
    
    Args:
        query: The user's question
        document_id: Optional ID of a specific document to chat with
        collection_id: Optional ID of a collection to chat with
        chat_id: Optional ID for continuing a conversation
        
    Returns:
        The AI's response
    """
    try:
        # Validate that either document_id or collection_id is provided
        if not document_id and not collection_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either document_id or collection_id must be provided"
            )
        
        # Get the appropriate collection name for Chroma
        if document_id:
            # Verify document exists
            doc = db.query(Document).filter(Document.id == document_id).first()
            if not doc:
                raise HTTPException(status_code=404, detail="Document not found")
            collection_name = f"doc_{document_id}"
        else:
            # Verify collection exists
            collection = db.query(Collection).filter(Collection.id == collection_id).first()
            if not collection:
                raise HTTPException(status_code=404, detail="Collection not found")
            collection_name = f"coll_{collection_id}"
        
        # Initialize or retrieve chat history
        if not chat_id:
            chat_id = str(uuid.uuid4())
            chat_history[chat_id] = []
        
        # Create conversation chain
        memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key='answer'
        )
        
        # Load previous messages into memory
        for msg in chat_history[chat_id]:
            if msg["role"] == "user":
                memory.chat_memory.add_user_message(msg["content"])
            else:
                memory.chat_memory.add_ai_message(msg["content"])
        
        # Create retrieval chain
        qa_chain = ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=document_processor.get_retriever(collection_name=collection_name),
            memory=memory,
            return_source_documents=True,
            combine_docs_chain_kwargs={"prompt": QA_PROMPT},
            verbose=True
        )
        
        # Get response
        result = qa_chain({"question": query})
        
        # Update chat history
        chat_history[chat_id].extend([
            {"role": "user", "content": query},
            {"role": "assistant", "content": result["answer"]}
        ])
        
        # Prepare sources
        sources = []
        for doc in result.get("source_documents", []):
            if hasattr(doc, 'metadata'):
                sources.append({
                    "content": doc.page_content,
                    "metadata": doc.metadata
                })
        
        return {
            "chat_id": chat_id,
            "query": query,
            "answer": result["answer"],
            "sources": sources
        }
        
    except Exception as e:
        logger.error(f"Error in chat_with_document: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat: {str(e)}"
        )

@router.post("/stream")
async def chat_stream(
    query: str,
    document_id: Optional[str] = None,
    collection_id: Optional[str] = None,
    chat_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Stream chat response for a more interactive experience
    """
    async def generate() -> AsyncGenerator[str, None]:
        try:
            # This is a simplified version - in a real implementation, you would
            # stream tokens from the LLM as they're generated
            response = await chat_with_document(
                query=query,
                document_id=document_id,
                collection_id=collection_id,
                chat_id=chat_id,
                db=db
            )
            
            # Stream the response in chunks
            for word in response["answer"].split():
                yield f"data: {json.dumps({'token': word + ' '})}\n\n"
                
            # Send a final message with the full response
            yield f"data: {json.dumps({'done': True, 'response': response})}\n\n"
            
        except Exception as e:
            logger.error(f"Error in chat_stream: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

@router.get("/history/{chat_id}")
async def get_chat_history(
    chat_id: str
):
    """Retrieve chat history"""
    return {
        "chat_id": chat_id,
        "history": chat_history.get(chat_id, [])
    }

@router.delete("/history/{chat_id}")
async def clear_chat_history(
    chat_id: str
):
    """Clear chat history"""
    if chat_id in chat_history:
        chat_history[chat_id] = []
        return {"status": "success", "message": "Chat history cleared"}
    else:
        raise HTTPException(status_code=404, detail="Chat not found")
