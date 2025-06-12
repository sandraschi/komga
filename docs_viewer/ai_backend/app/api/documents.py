from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from pathlib import Path
import shutil
import uuid
from typing import List, Optional
import logging

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.document import Document, DocumentChunk, Collection
from app.services.document_processor import DocumentProcessor
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize document processor
document_processor = DocumentProcessor(
    upload_dir=settings.UPLOAD_DIR,
    chroma_db_path=settings.CHROMA_DB_PATH
)

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    collection_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Upload a document for processing and storage.
    
    Args:
        file: The file to upload
        collection_name: Optional name of the collection to add this document to
        
    Returns:
        Document metadata and processing status
    """
    try:
        # Generate a unique filename
        file_ext = Path(file.filename).suffix
        file_id = str(uuid.uuid4())
        filename = f"{file_id}{file_ext}"
        
        # Save the uploaded file
        file_path = document_processor.save_uploaded_file(file.file, filename)
        file_info = document_processor.get_file_info(file_path)
        
        # Create document record in database
        db_doc = Document(
            id=file_id,
            title=file.filename,
            file_path=str(file_path),
            file_name=file.filename,
            file_size=file_info['file_size'],
            file_type=file_ext[1:],  # Remove the dot
            mime_type=file_info['mime_type'],
        )
        
        # Add to collection if specified
        if collection_name:
            collection = db.query(Collection).filter(Collection.name == collection_name).first()
            if collection:
                db_doc.collections.append(collection)
        
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)
        
        # Process the document asynchronously
        try:
            processed_doc = document_processor.process_document(file_path)
            
            # Update document status
            db_doc.is_processed = True
            db_doc.page_count = len(processed_doc['chunks'])
            db.commit()
            
            # Save chunks to database
            for i, chunk in enumerate(processed_doc['chunks']):
                db_chunk = DocumentChunk(
                    document_id=file_id,
                    content=chunk['page_content'],
                    chunk_index=i,
                    page_number=chunk['metadata'].get('page', 1),
                    metadata_=chunk['metadata']
                )
                db.add(db_chunk)
            
            db.commit()
            
            return {
                "status": "success",
                "document_id": file_id,
                "filename": file.filename,
                "chunk_count": len(processed_doc['chunks']),
                "collection_name": collection_name or "default"
            }
            
        except Exception as e:
            logger.error(f"Error processing document: {e}", exc_info=True)
            db_doc.processing_error = str(e)
            db.commit()
            
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Error processing document: {str(e)}"
            )
    
    except Exception as e:
        logger.error(f"Error uploading document: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading document: {str(e)}"
        )

@router.get("/{document_id}")
def get_document(
    document_id: str,
    db: Session = Depends(get_db)
):
    """Get document metadata by ID"""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return doc.to_dict()

@router.get("/{document_id}/chunks")
def get_document_chunks(
    document_id: str,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get document chunks with pagination"""
    # Verify document exists
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get chunks with pagination
    chunks = db.query(DocumentChunk)\
        .filter(DocumentChunk.document_id == document_id)\
        .order_by(DocumentChunk.chunk_index)\
        .offset(skip)\
        .limit(limit)\
        .all()
    
    total = db.query(DocumentChunk)\
        .filter(DocumentChunk.document_id == document_id)\
        .count()
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "chunks": [chunk.to_dict() for chunk in chunks]
    }

@router.get("/{document_id}/search")
def search_document(
    document_id: str,
    query: str,
    k: int = 5,
    db: Session = Depends(get_db)
):
    """Search within a specific document"""
    # Verify document exists
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get collection name (using document ID as collection name)
    collection_name = f"doc_{document_id}"
    
    try:
        # Search in Chroma
        results = document_processor.search_documents(query, collection_name=collection_name, k=k)
        
        # Get full chunk details from database
        chunk_ids = [r['metadata'].get('chunk_id') for r in results if r['metadata'].get('chunk_id')]
        chunks = db.query(DocumentChunk)\
            .filter(DocumentChunk.id.in_(chunk_ids))\
            .all()
            
        # Map chunks by ID for easy lookup
        chunk_map = {str(chunk.id): chunk for chunk in chunks}
        
        # Prepare response with chunk details
        response = []
        for result in results:
            chunk_id = result['metadata'].get('chunk_id')
            if chunk_id in chunk_map:
                chunk = chunk_map[chunk_id]
                response.append({
                    "content": result['content'],
                    "score": result.get('score', 0.0),
                    "chunk_id": chunk.id,
                    "chunk_index": chunk.chunk_index,
                    "page_number": chunk.page_number,
                    "metadata": chunk.metadata_
                })
        
        return {
            "document_id": document_id,
            "query": query,
            "results": response
        }
        
    except Exception as e:
        logger.error(f"Error searching document: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error searching document: {str(e)}"
        )

@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    db: Session = Depends(get_db)
):
    """Delete a document and its chunks"""
    # Get document with chunks
    doc = db.query(Document)\
        .filter(Document.id == document_id)\
        .first()
        
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        # Delete file
        file_path = Path(doc.file_path)
        if file_path.exists():
            file_path.unlink()
        
        # Delete from Chroma (if exists)
        collection_name = f"doc_{document_id}"
        try:
            # This is a placeholder - actual Chroma deletion would go here
            pass
        except Exception as e:
            logger.warning(f"Error deleting from Chroma: {e}")
        
        # Delete from database (cascades to chunks)
        db.delete(doc)
        db.commit()
        
        return {"status": "success", "message": "Document deleted"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting document: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting document: {str(e)}"
        )
