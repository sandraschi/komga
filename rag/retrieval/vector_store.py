"""
Vector store implementation for efficient similarity search.
Uses ChromaDB as the underlying vector database.
"""

from typing import List, Dict, Any, Optional, Union
import numpy as np
import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
import uuid
import json
from pathlib import Path
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VectorStore:
    def __init__(
        self, 
        persist_directory: str = "./chroma_db",
        embedding_model: str = "all-MiniLM-L6-v2",
        collection_name: str = "documents"
    ):
        """Initialize the vector store with ChromaDB backend.
        
        Args:
            persist_directory: Directory to store the database
            embedding_model: Name of the sentence-transformers model to use
            collection_name: Name of the collection to store documents in
        """
        self.persist_directory = Path(persist_directory)
        self.embedding_model = embedding_model
        self.collection_name = collection_name
        
        # Create directory if it doesn't exist
        self.persist_directory.mkdir(parents=True, exist_ok=True)
        
        # Initialize Chroma client
        self.client = chromadb.Client(
            Settings(
                chroma_db_impl="duckdb+parquet",
                persist_directory=str(self.persist_directory.absolute()),
                anonymized_telemetry=False
            )
        )
        
        # Initialize embedding function
        self.embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=embedding_model
        )
        
        # Get or create collection
        self.collection = self._get_or_create_collection()
    
    def _get_or_create_collection(self):
        """Get existing collection or create a new one if it doesn't exist."""
        try:
            # Try to get existing collection
            return self.client.get_collection(
                name=self.collection_name,
                embedding_function=self.embedding_function
            )
        except ValueError:
            # Create new collection if it doesn't exist
            return self.client.create_collection(
                name=self.collection_name,
                embedding_function=self.embedding_function,
                metadata={"hnsw:space": "cosine"}  # Use cosine similarity
            )
    
    def add_documents(
        self, 
        documents: List[Dict[str, Any]],
        batch_size: int = 100
    ) -> List[str]:
        """Add documents to the vector store.
        
        Args:
            documents: List of document dictionaries with 'text' and 'metadata' keys
            batch_size: Number of documents to process in each batch
            
        Returns:
            List of document IDs
        """
        if not documents:
            return []
            
        document_ids = []
        
        # Process in batches to avoid memory issues
        for i in range(0, len(documents), batch_size):
            batch = documents[i:i + batch_size]
            
            # Prepare batch data
            ids = []
            texts = []
            metadatas = []
            
            for doc in batch:
                doc_id = str(uuid.uuid4())
                ids.append(doc_id)
                texts.append(doc['text'])
                
                # Ensure metadata is JSON-serializable
                metadata = doc.get('metadata', {})
                if not isinstance(metadata, dict):
                    metadata = {}
                
                # Convert any non-serializable values to strings
                for k, v in metadata.items():
                    try:
                        json.dumps(v)
                    except (TypeError, OverflowError):
                        metadata[k] = str(v)
                
                metadatas.append(metadata)
            
            # Add batch to collection
            try:
                self.collection.add(
                    documents=texts,
                    metadatas=metadatas,
                    ids=ids
                )
                document_ids.extend(ids)
                logger.info(f"Added batch of {len(batch)} documents")
                
                # Persist after each batch
                self.client.persist()
                
            except Exception as e:
                logger.error(f"Error adding batch {i//batch_size + 1}: {e}")
                # Try to continue with next batch
                continue
        
        return document_ids
    
    def search(
        self, 
        query: str, 
        n_results: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None,
        include: List[str] = ["documents", "metadatas", "distances"]
    ) -> Dict[str, List]:
        """Search for similar documents.
        
        Args:
            query: The query string
            n_results: Number of results to return
            filter_metadata: Optional metadata filters
            include: What to include in the results
            
        Returns:
            Dictionary containing search results
        """
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results,
                where=filter_metadata,
                include=include
            )
            
            # Convert to a more user-friendly format
            return {
                'documents': results['documents'][0] if 'documents' in results else [],
                'metadatas': results['metadatas'][0] if 'metadatas' in results else [],
                'distances': results['distances'][0] if 'distances' in results else [],
                'ids': results['ids'][0] if 'ids' in results else []
            }
            
        except Exception as e:
            logger.error(f"Error searching: {e}")
            return {
                'documents': [],
                'metadatas': [],
                'distances': [],
                'ids': []
            }
    
    def delete_documents(self, document_ids: List[str]) -> bool:
        """Delete documents by their IDs."""
        if not document_ids:
            return False
            
        try:
            self.collection.delete(ids=document_ids)
            self.client.persist()
            return True
        except Exception as e:
            logger.error(f"Error deleting documents: {e}")
            return False
    
    def update_document(self, document_id: str, text: str, metadata: Dict[str, Any]) -> bool:
        """Update an existing document."""
        try:
            self.collection.update(
                ids=[document_id],
                documents=[text],
                metadatas=[metadata]
            )
            self.client.persist()
            return True
        except Exception as e:
            logger.error(f"Error updating document {document_id}: {e}")
            return False
    
    def get_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Get a document by ID."""
        try:
            result = self.collection.get(ids=[document_id])
            if not result['ids']:
                return None
                
            return {
                'id': result['ids'][0],
                'text': result['documents'][0],
                'metadata': result['metadatas'][0],
                'embedding': result['embeddings'][0] if 'embeddings' in result else None
            }
        except Exception as e:
            logger.error(f"Error getting document {document_id}: {e}")
            return None
    
    def count_documents(self) -> int:
        """Get the total number of documents in the collection."""
        try:
            return self.collection.count()
        except Exception as e:
            logger.error(f"Error counting documents: {e}")
            return 0
    
    def clear_collection(self) -> bool:
        """Clear all documents from the collection."""
        try:
            self.client.delete_collection(self.collection_name)
            self.collection = self._get_or_create_collection()
            return True
        except Exception as e:
            logger.error(f"Error clearing collection: {e}")
            return False

# Example usage
if __name__ == "__main__":
    # Initialize vector store
    vector_store = VectorStore()
    
    # Example documents
    documents = [
        {
            'text': 'The quick brown fox jumps over the lazy dog.',
            'metadata': {'source': 'example1', 'type': 'test'}
        },
        {
            'text': 'Pack my box with five dozen liquor jugs.',
            'metadata': {'source': 'example2', 'type': 'test'}
        }
    ]
    
    # Add documents
    doc_ids = vector_store.add_documents(documents)
    print(f"Added documents with IDs: {doc_ids}")
    
    # Search for similar documents
    results = vector_store.search("fox jumping", n_results=2)
    print("\nSearch results:")
    for doc, meta in zip(results['documents'], results['metadatas']):
        print(f"- {doc} (Source: {meta.get('source', 'N/A')})")
    
    # Clean up
    vector_store.clear_collection()
