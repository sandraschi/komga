from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional, Dict, Any
import logging

from sqlalchemy.orm import Session

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

@router.get("/semantic")
def semantic_search(
    query: str,
    document_ids: Optional[List[str]] = Query(None),
    collection_ids: Optional[List[str]] = Query(None),
    k: int = 5,
    threshold: float = 0.7,
    db: Session = Depends(get_db)
):
    """
    Perform semantic search across documents or collections
    
    Args:
        query: The search query
        document_ids: Optional list of document IDs to search within
        collection_ids: Optional list of collection IDs to search within
        k: Maximum number of results to return
        threshold: Minimum similarity score (0-1) for results
        
    Returns:
        List of matching document chunks with scores
    """
    try:
        # Validate input
        if not document_ids and not collection_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either document_ids or collection_ids must be provided"
            )
        
        # Get all document IDs to search
        doc_ids = set()
        
        if document_ids:
            # Verify documents exist
            docs = db.query(Document).filter(Document.id.in_(document_ids)).all()
            if len(docs) != len(document_ids):
                found_ids = {str(doc.id) for doc in docs}
                missing = set(document_ids) - found_ids
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Documents not found: {', '.join(missing)}"
                )
            doc_ids.update(document_ids)
        
        if collection_ids:
            # Get all documents from the specified collections
            collections = db.query(Collection).filter(Collection.id.in_(collection_ids)).all()
            if len(collections) != len(collection_ids):
                found_ids = {str(coll.id) for coll in collections}
                missing = set(collection_ids) - found_ids
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Collections not found: {', '.join(missing)}"
                )
            
            for collection in collections:
                doc_ids.update(str(doc.id) for doc in collection.documents)
        
        # Perform search across all relevant collections
        all_results = []
        
        for doc_id in doc_ids:
            collection_name = f"doc_{doc_id}"
            try:
                results = document_processor.search_documents(
                    query=query,
                    collection_name=collection_name,
                    k=k
                )
                
                # Add document context to results
                for result in results:
                    result['document_id'] = doc_id
                    doc = db.query(Document).get(doc_id)
                    if doc:
                        result['document_title'] = doc.title
                        result['document_metadata'] = doc.to_dict()
                
                all_results.extend(results)
                
            except Exception as e:
                logger.warning(f"Error searching document {doc_id}: {e}")
                continue
        
        # Sort results by score and apply threshold
        all_results.sort(key=lambda x: x.get('score', 0), reverse=True)
        filtered_results = [r for r in all_results if r.get('score', 0) >= threshold]
        
        # Limit results
        final_results = filtered_results[:k]
        
        # Get full chunk details from database
        chunk_ids = [r['metadata'].get('chunk_id') for r in final_results if r['metadata'].get('chunk_id')]
        chunks = db.query(DocumentChunk)\
            .filter(DocumentChunk.id.in_(chunk_ids))\
            .all()
            
        # Map chunks by ID for easy lookup
        chunk_map = {str(chunk.id): chunk for chunk in chunks}
        
        # Prepare response with chunk and document details
        response = []
        for result in final_results:
            chunk_id = result['metadata'].get('chunk_id')
            chunk = chunk_map.get(chunk_id)
            
            if chunk:
                response.append({
                    "content": result['content'],
                    "score": result.get('score', 0.0),
                    "chunk_id": chunk.id,
                    "chunk_index": chunk.chunk_index,
                    "page_number": chunk.page_number,
                    "metadata": chunk.metadata_,
                    "document": result.get('document_metadata', {})
                })
        
        return {
            "query": query,
            "total_results": len(response),
            "results": response
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in semantic search: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error performing semantic search: {str(e)}"
        )

@router.get("/hybrid")
def hybrid_search(
    query: str,
    document_ids: Optional[List[str]] = Query(None),
    collection_ids: Optional[List[str]] = Query(None),
    k: int = 5,
    alpha: float = 0.5,
    db: Session = Depends(get_db)
):
    """
    Perform hybrid search combining semantic and keyword search
    
    Args:
        query: The search query
        document_ids: Optional list of document IDs to search within
        collection_ids: Optional list of collection IDs to search within
        k: Maximum number of results to return
        alpha: Weight for combining scores (0-1, where 1 is fully semantic)
        
    Returns:
        List of matching document chunks with combined scores
    """
    try:
        # First perform semantic search
        semantic_results = semantic_search(
            query=query,
            document_ids=document_ids,
            collection_ids=collection_ids,
            k=k * 2,  # Get more results for better ranking
            threshold=0.0,  # Include all results for hybrid ranking
            db=db
        )
        
        # TODO: Add keyword search implementation
        # For now, we'll just return the semantic results
        
        # Sort by score and limit to k results
        results = semantic_results.get("results", [])
        results.sort(key=lambda x: x.get("score", 0), reverse=True)
        
        return {
            "query": query,
            "total_results": len(results[:k]),
            "results": results[:k],
            "search_type": "hybrid"
        }
        
    except Exception as e:
        logger.error(f"Error in hybrid search: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error performing hybrid search: {str(e)}"
        )

@router.get("/suggest")
def search_suggestions(
    prefix: str,
    k: int = 5,
    db: Session = Depends(get_db)
):
    """
    Get search suggestions based on document content
    """
    try:
        # This is a simplified implementation
        # In a real app, you might use a dedicated search index with prefix search
        
        # Search in document titles and content
        # Note: This is not efficient for large datasets
        suggestions = set()
        
        # Search in document titles
        docs = db.query(Document)\
            .filter(Document.title.ilike(f"%{prefix}%"))\
            .limit(k)\
            .all()
        
        for doc in docs:
            # Add words from title that start with the prefix
            words = [w for w in doc.title.split() if w.lower().startswith(prefix.lower())]
            suggestions.update(words[:k - len(suggestions)])
            if len(suggestions) >= k:
                break
        
        # If we need more suggestions, search in document content
        if len(suggestions) < k:
            chunks = db.query(DocumentChunk)\
                .filter(DocumentChunk.content.ilike(f"%{prefix}%"))\
                .limit((k - len(suggestions)) * 2)\
                .all()
            
            for chunk in chunks:
                # Add words from content that start with the prefix
                words = [w for w in chunk.content.split() if w.lower().startswith(prefix.lower())]
                suggestions.update(words[:k - len(suggestions)])
                if len(suggestions) >= k:
                    break
        
        return {
            "prefix": prefix,
            "suggestions": list(suggestions)[:k]
        }
        
    except Exception as e:
        logger.error(f"Error generating search suggestions: {e}", exc_info=True)
        return {
            "prefix": prefix,
            "suggestions": []
        }
