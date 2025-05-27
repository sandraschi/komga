"""
Main RAG (Retrieval-Augmented Generation) service for Komga.
This module provides a high-level interface for document processing, retrieval, and generation.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional, Union
from pathlib import Path
from dataclasses import dataclass, asdict
import hashlib

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import local modules
try:
    from processing.document_processor import DocumentProcessor
    from retrieval.vector_store import VectorStore
    from retrieval.retriever import Retriever
    from analysis.thematic_analyzer import ThematicAnalyzer, Theme, ThemeType
except ImportError as e:
    logger.error(f"Failed to import required modules: {e}")
    raise

@dataclass
class RAGConfig:
    """Configuration for the RAG service."""
    # Document processing
    chunk_size: int = 1000
    chunk_overlap: int = 200
    
    # Vector store
    persist_directory: str = "./chroma_db"
    embedding_model: str = "all-MiniLM-L6-v2"
    collection_name: str = "komga_documents"
    
    # Retrieval
    retrieval_top_k: int = 5
    use_reranking: bool = True
    rerank_top_k: int = 3
    
    # Thematic analysis
    min_theme_occurrences: int = 3
    theme_confidence_threshold: float = 0.7
    
    # Caching
    cache_dir: str = "./rag_cache"
    use_cache: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'RAGConfig':
        """Create config from dictionary."""
        return cls(**data)

class RAGService:
    """Main RAG service for document processing and retrieval."""
    
    def __init__(self, config: Optional[RAGConfig] = None, llm_service=None):
        """Initialize the RAG service.
        
        Args:
            config: Configuration for the RAG service
            llm_service: Optional LLM service for generation and enhancement
        """
        self.config = config or RAGConfig()
        self.llm_service = llm_service
        
        # Initialize components
        self._init_components()
        
        # Ensure cache directory exists
        os.makedirs(self.config.cache_dir, exist_ok=True)
    
    def _init_components(self):
        """Initialize RAG components."""
        logger.info("Initializing RAG components...")
        
        # Document processor
        self.document_processor = DocumentProcessor(
            model_name=self.config.embedding_model
        )
        
        # Vector store
        self.vector_store = VectorStore(
            persist_directory=self.config.persist_directory,
            embedding_model=self.config.embedding_model,
            collection_name=self.config.collection_name
        )
        
        # Retriever
        self.retriever = Retriever(
            vector_store=self.vector_store,
            use_reranking=self.config.use_reranking,
            retrieval_top_k=self.config.retrieval_top_k,
            rerank_top_k=self.config.rerank_top_k
        )
        
        # Thematic analyzer
        self.theme_analyzer = ThematicAnalyzer(
            llm_service=self.llm_service,
            min_theme_occurrences=self.config.min_theme_occurrences,
            theme_confidence_threshold=self.config.theme_confidence_threshold
        )
        
        logger.info("RAG components initialized")
    
    def process_document(
        self, 
        file_path: Union[str, Path],
        metadata: Optional[Dict[str, Any]] = None,
        force_reprocess: bool = False
    ) -> Dict[str, Any]:
        """Process a document and add it to the vector store.
        
        Args:
            file_path: Path to the document file
            metadata: Additional metadata for the document
            force_reprocess: If True, reprocess even if cached
            
        Returns:
            Dictionary with processing results
        """
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Generate cache key
        cache_key = self._generate_cache_key(file_path, metadata)
        cache_file = Path(self.config.cache_dir) / f"{cache_key}.json"
        
        # Check cache
        if not force_reprocess and self.config.use_cache and cache_file.exists():
            logger.info(f"Loading from cache: {cache_file}")
            with open(cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        
        # Process document
        logger.info(f"Processing document: {file_path}")
        result = self.document_processor.process_document(
            file_path=str(file_path),
            metadata=metadata or {}
        )
        
        # Add to vector store
        doc_ids = self.vector_store.add_documents(result['chunks'])
        result['document_ids'] = doc_ids
        
        # Save to cache
        if self.config.use_cache:
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
        
        return result
    
    def search(
        self, 
        query: str,
        n_results: int = None,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Search for documents relevant to the query.
        
        Args:
            query: The search query
            n_results: Number of results to return
            filter_metadata: Optional metadata filters
            
        Returns:
            List of relevant documents with scores and metadata
        """
        n_results = n_results or self.config.retrieval_top_k
        return self.retriever.retrieve(
            query=query,
            n_results=n_results,
            filter_metadata=filter_metadata
        )
    
    def analyze_themes(
        self,
        text: str,
        title: str = None,
        author: str = None,
        metadata: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """Analyze themes in the given text.
        
        Args:
            text: The text to analyze
            title: Optional title of the work
            author: Optional author of the work
            metadata: Additional metadata
            
        Returns:
            List of identified themes with analysis
        """
        themes = self.theme_analyzer.analyze_text(
            text=text,
            title=title,
            author=author,
            metadata=metadata or {}
        )
        
        # Convert Theme objects to dictionaries
        return [theme.to_dict() for theme in themes]
    
    def generate_response(
        self,
        query: str,
        context_documents: List[Dict[str, Any]] = None,
        max_tokens: int = 512,
        temperature: float = 0.7,
        **generation_kwargs
    ) -> Dict[str, Any]:
        """Generate a response to the query using the RAG pipeline.
        
        Args:
            query: The user's query
            context_documents: Optional pre-retrieved documents for context
            max_tokens: Maximum number of tokens to generate
            temperature: Generation temperature
            **generation_kwargs: Additional generation parameters
            
        Returns:
            Dictionary with generated response and metadata
        """
        if not self.llm_service:
            raise ValueError("LLM service is required for generation")
        
        # Retrieve relevant documents if not provided
        if context_documents is None:
            context_documents = self.search(query)
        
        # Prepare context
        context = self._prepare_context(context_documents)
        
        # Generate prompt
        prompt = self._build_generation_prompt(query, context)
        
        # Generate response
        try:
            response = self.llm_service.generate(
                prompt=prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                **generation_kwargs
            )
            
            return {
                'response': response,
                'context_documents': context_documents,
                'prompt': prompt,
                'metadata': {
                    'model': getattr(self.llm_service, 'model_name', 'unknown'),
                    'max_tokens': max_tokens,
                    'temperature': temperature,
                    **generation_kwargs
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return {
                'response': f"I'm sorry, I encountered an error: {str(e)}",
                'error': str(e),
                'context_documents': context_documents,
                'prompt': prompt
            }
    
    def _generate_cache_key(
        self, 
        file_path: Union[str, Path], 
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate a cache key for a document."""
        file_path = Path(file_path)
        file_stat = file_path.stat()
        
        # Create a unique key based on file properties and metadata
        key_parts = [
            file_path.name,
            str(file_stat.st_size),
            str(int(file_stat.st_mtime)),
            json.dumps(metadata or {}, sort_keys=True)
        ]
        
        key_string = "_".join(key_parts).encode('utf-8')
        return hashlib.md5(key_string).hexdigest()
    
    def _prepare_context(
        self, 
        documents: List[Dict[str, Any]],
        max_chars: int = 4000
    ) -> str:
        """Prepare context from retrieved documents."""
        context_parts = []
        total_chars = 0
        
        for doc in documents:
            text = doc.get('text', '')
            source = doc.get('metadata', {}).get('source', 'document')
            
            # Truncate if needed
            if total_chars + len(text) > max_chars:
                remaining = max(0, max_chars - total_chars - 100)  # Leave room for ellipsis
                if remaining > 100:  # Only add if we have significant content left
                    text = text[:remaining] + "... [truncated]"
                else:
                    break
            
            context_parts.append(f"--- {source} ---\n{text}\n")
            total_chars += len(text)
            
            if total_chars >= max_chars:
                break
        
        return "\n".join(context_parts)
    
    def _build_generation_prompt(
        self, 
        query: str, 
        context: str
    ) -> str:
        """Build a prompt for the LLM."""
        return f"""You are a helpful assistant that answers questions based on the provided context.
        
Context:
{context}

Question: {query}

Please provide a detailed and accurate answer based on the context above. If the context doesn't contain enough information, say so explicitly.

Answer:"""

    def clear_cache(self) -> bool:
        """Clear the document cache."""
        try:
            cache_dir = Path(self.config.cache_dir)
            for file in cache_dir.glob("*"):
                try:
                    file.unlink()
                except Exception as e:
                    logger.warning(f"Failed to delete {file}: {e}")
            return True
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return False
    
    def get_document_count(self) -> int:
        """Get the total number of documents in the vector store."""
        return self.vector_store.count_documents()
    
    def delete_document(self, document_id: str) -> bool:
        """Delete a document from the vector store."""
        return self.vector_store.delete_documents([document_id])
    
    def reset_vector_store(self) -> bool:
        """Clear all documents from the vector store."""
        return self.vector_store.clear_collection()

# Example usage
if __name__ == "__main__":
    # Initialize RAG service
    config = RAGConfig(
        persist_directory="./example_chroma_db",
        cache_dir="./example_cache"
    )
    
    rag = RAGService(config)
    
    # Example document processing
    try:
        # Process a document
        result = rag.process_document(
            "example.txt",
            metadata={"source": "example", "type": "test"}
        )
        print(f"Processed document with {len(result['chunks'])} chunks")
        
        # Search for relevant information
        query = "What are the main themes?"
        results = rag.search(query)
        print(f"\nSearch results for '{query}':")
        for i, doc in enumerate(results, 1):
            print(f"{i}. {doc['text'][:200]}... (score: {doc.get('score', 0):.3f})")
        
        # Analyze themes
        themes = rag.analyze_themes(
            "The quick brown fox jumps over the lazy dog. The dog was not amused.",
            title="Test Document",
            author="Test Author"
        )
        print("\nIdentified themes:")
        for theme in themes:
            print(f"- {theme['name']} ({theme['theme_type']}): {theme['description']}")
        
    finally:
        # Clean up
        rag.clear_cache()
        rag.reset_vector_store()
        print("\nCleaned up temporary files and database.")
