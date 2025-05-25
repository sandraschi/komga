"""
Advanced retrieval component for the RAG system.
Handles query processing, retrieval, and ranking of documents.
"""

from typing import List, Dict, Any, Optional, Union
import numpy as np
from sentence_transformers import CrossEncoder
from .vector_store import VectorStore
import logging
import json

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Retriever:
    def __init__(
        self, 
        vector_store: VectorStore,
        cross_encoder_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
        use_reranking: bool = True,
        retrieval_top_k: int = 50,
        rerank_top_k: int = 5
    ):
        """Initialize the retriever with a vector store and optional reranker.
        
        Args:
            vector_store: Initialized VectorStore instance
            cross_encoder_model: Name of the cross-encoder model for reranking
            use_reranking: Whether to use cross-encoder for reranking
            retrieval_top_k: Number of documents to retrieve before reranking
            rerank_top_k: Number of documents to return after reranking
        """
        self.vector_store = vector_store
        self.use_reranking = use_reranking
        self.retrieval_top_k = retrieval_top_k
        self.rerank_top_k = rerank_top_k
        
        # Initialize cross-encoder for reranking if enabled
        self.cross_encoder = None
        if use_reranking:
            try:
                self.cross_encoder = CrossEncoder(cross_encoder_model)
            except Exception as e:
                logger.warning(f"Failed to load cross-encoder: {e}. Falling back to vector similarity.")
                self.use_reranking = False
    
    def retrieve(
        self, 
        query: str, 
        n_results: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None,
        expand_query: bool = True
    ) -> List[Dict[str, Any]]:
        """Retrieve and rank documents relevant to the query.
        
        Args:
            query: The search query
            n_results: Number of results to return
            filter_metadata: Optional metadata filters
            expand_query: Whether to expand the query with similar terms
            
        Returns:
            List of relevant documents with scores and metadata
        """
        # Step 1: Query expansion (optional)
        expanded_query = self._expand_query(query) if expand_query else query
        
        # Step 2: First-stage retrieval (vector similarity)
        results = self.vector_store.search(
            query=expanded_query,
            n_results=self.retrieval_top_k,
            filter_metadata=filter_metadata,
            include=["documents", "metadatas", "distances", "embeddings"]
        )
        
        if not results['documents']:
            return []
        
        # Step 3: Rerank with cross-encoder if enabled
        if self.use_reranking and self.cross_encoder:
            return self._rerank_with_cross_encoder(query, results, n_results)
        
        # If no reranking, just return top N results
        return self._format_results(results, n_results)
    
    def _expand_query(self, query: str) -> str:
        """Expand the query with similar terms or related concepts."""
        # Simple implementation - in practice, you might use a language model
        # to generate query variations or expand with related terms
        
        # For now, just return the original query
        # In a real implementation, you might use something like:
        # 1. Synonym expansion
        # 2. Query reformulation using LLM
        # 3. Entity linking to include related concepts
        
        return query
    
    def _rerank_with_cross_encoder(
        self, 
        query: str, 
        results: Dict[str, List], 
        n_results: int
    ) -> List[Dict[str, Any]]:
        """Rerank results using a cross-encoder for better precision."""
        if not results['documents']:
            return []
        
        # Prepare pairs for cross-encoder
        pairs = [(query, doc) for doc in results['documents']]
        
        # Get scores from cross-encoder
        scores = self.cross_encoder.predict(pairs)
        
        # Combine with original results
        scored_results = []
        for i, (doc, metadata, distance, embedding) in enumerate(zip(
            results['documents'],
            results['metadatas'],
            results['distances'],
            results['embeddings']
        )):
            scored_results.append({
                'text': doc,
                'metadata': metadata,
                'vector_score': float(1.0 - (distance / 2.0)),  # Convert cosine distance to similarity
                'cross_encoder_score': float(scores[i]),
                'combined_score': float((1.0 - (distance / 2.0)) * 0.4 + scores[i] * 0.6),
                'embedding': embedding
            })
        
        # Sort by combined score
        scored_results.sort(key=lambda x: x['combined_score'], reverse=True)
        
        # Return top N results
        return scored_results[:n_results]
    
    def _format_results(
        self, 
        results: Dict[str, List], 
        n_results: int
    ) -> List[Dict[str, Any]]:
        """Format results into a consistent format."""
        formatted = []
        
        for i, (doc, metadata, distance, embedding) in enumerate(zip(
            results['documents'],
            results['metadatas'],
            results['distances'],
            results.get('embeddings', [None] * len(results['documents']))
        )):
            if i >= n_results:
                break
                
            formatted.append({
                'text': doc,
                'metadata': metadata,
                'score': float(1.0 - (distance / 2.0)),  # Convert cosine distance to similarity
                'embedding': embedding
            })
        
        return formatted
    
    def batch_retrieve(
        self, 
        queries: List[str], 
        n_results: int = 5, 
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Retrieve documents for multiple queries in batch."""
        results = {}
        for query in queries:
            results[query] = self.retrieve(
                query=query,
                n_results=n_results,
                filter_metadata=filter_metadata
            )
        return results
    
    def get_similar_documents(
        self, 
        document_id: str, 
        n_results: int = 5
    ) -> List[Dict[str, Any]]:
        """Find documents similar to a specific document."""
        # Get the document
        doc = self.vector_store.get_document(document_id)
        if not doc:
            return []
        
        # Search by embedding
        results = self.vector_store.search(
            query_embeddings=[doc['embedding']],
            n_results=n_results + 1,  # +1 because the document itself will be in results
            include=["documents", "metadatas", "distances"]
        )
        
        # Filter out the document itself
        filtered_results = {
            'documents': [],
            'metadatas': [],
            'distances': []
        }
        
        for i, doc_id in enumerate(results['ids']):
            if doc_id != document_id and len(filtered_results['documents']) < n_results:
                filtered_results['documents'].append(results['documents'][i])
                filtered_results['metadatas'].append(results['metadatas'][i])
                filtered_results['distances'].append(results['distances'][i])
        
        return self._format_results(filtered_results, n_results)

# Example usage
if __name__ == "__main__":
    from processing.document_processor import DocumentProcessor
    from retrieval.vector_store import VectorStore
    
    # Initialize components
    vector_store = VectorStore()
    retriever = Retriever(vector_store)
    
    # Example documents
    documents = [
        {
            'text': 'The quick brown fox jumps over the lazy dog.',
            'metadata': {'source': 'example1', 'type': 'test'}
        },
        {
            'text': 'Pack my box with five dozen liquor jugs.',
            'metadata': {'source': 'example2', 'type': 'test'}
        },
        {
            'text': 'The five boxing wizards jump quickly.',
            'metadata': {'source': 'example3', 'type': 'test'}
        }
    ]
    
    # Add documents
    vector_store.add_documents(documents)
    
    # Search for similar documents
    results = retriever.retrieve("fox jumping", n_results=2)
    
    print("\nSearch results:")
    for i, result in enumerate(results):
        print(f"{i+1}. {result['text']} (Score: {result['score']:.3f})")
    
    # Clean up
    vector_store.clear_collection()
