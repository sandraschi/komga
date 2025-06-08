"""
Document processing pipeline for RAG system.

This module handles the extraction, cleaning, and preparation of text from various
document formats for the Retrieval-Augmented Generation (RAG) system.
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union, TypedDict, Literal

import spacy
from sentence_transformers import SentenceTransformer

# Configure logging
logger = logging.getLogger(__name__)

# Type aliases
DocumentChunk = Dict[str, Any]
DocumentMetadata = Dict[str, Any]
FileContent = Union[str, bytes]  # Could be text content or binary data

class ProcessingResult(TypedDict):
    """Typed dictionary representing the result of document processing."""
    chunks: List[DocumentChunk]
    metadata: DocumentMetadata
    processing_time: float
    status: Literal["success", "partial", "failed"]

class DocumentProcessor:
    """Process documents for the RAG system.
    
    This class handles the extraction of text from various document formats,
    chunking of the extracted text, and generation of embeddings for each chunk.
    """
    
    def __init__(self, model_name: str = 'all-mpnet-base-v2') -> None:
        """Initialize the document processor.
        
        Args:
            model_name: Name of the sentence transformer model to use for embeddings.
                      Defaults to 'all-mpnet-base-v2'.
        
        Raises:
            OSError: If the required models cannot be loaded.
        """
        try:
            self.nlp = spacy.load('en_core_web_sm')
            self.embedding_model = SentenceTransformer(model_name)
            logger.info(f"Initialized DocumentProcessor with model: {model_name}")
        except Exception as e:
            logger.error(f"Failed to initialize DocumentProcessor: {e}")
            raise
        
    def process_document(
        self, 
        file_path: Union[str, Path], 
        metadata: Optional[DocumentMetadata] = None
    ) -> ProcessingResult:
        """Process a document and return structured data with embeddings.
        
        Args:
            file_path: Path to the document file to process.
            metadata: Optional metadata to include with the document chunks.
            
        Returns:
            A dictionary containing the processed document chunks, metadata, and processing status.
            
        Raises:
            FileNotFoundError: If the specified file does not exist.
            ValueError: If the file format is not supported or content extraction fails.
        """
        start_time = datetime.utcnow()
        file_path = Path(file_path)
        
        if not file_path.exists():
            error_msg = f"File not found: {file_path}"
            logger.error(error_msg)
            raise FileNotFoundError(error_msg)
            
        try:
            # Extract basic file metadata
            file_meta = self._get_file_metadata(file_path)
            logger.info(f"Processing document: {file_path.name} (ID: {file_meta.get('file_id')})")
            
            # Extract content based on file type
            content = self._extract_content(file_path)
            if not content:
                raise ValueError(f"Failed to extract content from {file_path}")
            
            # Process content into chunks
            chunks = self._chunk_content(content)
            if not chunks:
                logger.warning(f"No content chunks generated from {file_path}")
                return {
                    'chunks': [],
                    'metadata': {**(metadata or {}), **file_meta},
                    'processing_time': (datetime.utcnow() - start_time).total_seconds(),
                    'status': 'partial'
                }
            
            # Generate embeddings for each chunk
            processed_chunks: List[DocumentChunk] = []
            for i, chunk in enumerate(chunks):
                try:
                    # Generate embedding for the chunk
                    embedding = self.embedding_model.encode(chunk['text'])
                    
                    # Create chunk metadata
                    chunk_metadata = {
                        **chunk.get('metadata', {}),
                        'chunk_id': f"{file_meta['file_id']}_chunk_{i}",
                        'position': i,
                        'total_chunks': len(chunks),
                        **file_meta,
                        **(metadata or {})
                    }
                    
                    processed_chunks.append({
                        'text': chunk['text'],
                        'embedding': embedding.tolist(),
                        'metadata': chunk_metadata
                    })
                    
                except Exception as e:
                    logger.error(f"Error processing chunk {i} of {file_path}: {e}", exc_info=True)
            
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            logger.info(f"Processed {len(processed_chunks)} chunks from {file_path} in {processing_time:.2f}s")
            
            return {
                'chunks': processed_chunks,
                'metadata': {**(metadata or {}), **file_meta},
                'processing_time': processing_time,
                'status': 'success' if processed_chunks else 'partial'
            }
            
        except Exception as e:
            logger.error(f"Error processing document {file_path}: {e}", exc_info=True)
            return {
                'chunks': [],
                'metadata': {**(metadata or {}), 'file_path': str(file_path)},
                'processing_time': (datetime.utcnow() - start_time).total_seconds(),
                'status': 'failed',
                'error': str(e)
            }
    
    def _get_file_metadata(self, file_path: str) -> Dict[str, Any]:
        """Extract basic file metadata."""
        path = Path(file_path)
        stat = path.stat()
        
        return {
            'file_id': f"file_{stat.st_ino}",
            'file_name': path.name,
            'file_extension': path.suffix.lower(),
            'file_size': stat.st_size,
            'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
            'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
            'absolute_path': str(path.absolute())
        }
    
    def _extract_content(self, file_path: str) -> str:
        """Extract text content from various file formats."""
        path = Path(file_path)
        extension = path.suffix.lower()
        
        # Handle different file types
        if extension == '.pdf':
            return self._extract_pdf(file_path)
        elif extension == '.epub':
            return self._extract_epub(file_path)
        elif extension in ['.txt', '.md', '.markdown']:
            return self._extract_text(file_path)
        else:
            raise ValueError(f"Unsupported file format: {extension}")
    
    def _chunk_content(self, content: str, chunk_size: int = 1000, 
                      overlap: int = 200) -> List[Dict[str, Any]]:
        """Split content into overlapping chunks with semantic awareness."""
        if not content.strip():
            return []
            
        # Split into sentences first
        doc = self.nlp(content)
        sentences = [sent.text for sent in doc.sents]
        
        chunks = []
        current_chunk = []
        current_length = 0
        
        for sentence in sentences:
            sentence_length = len(sentence.split())
            
            # If adding this sentence would exceed chunk size, finalize current chunk
            if current_chunk and current_length + sentence_length > chunk_size:
                chunks.append({
                    'text': ' '.join(current_chunk),
                    'metadata': {
                        'chunk_type': 'text',
                        'word_count': current_length
                    }
                })
                
                # Start new chunk with overlap
                overlap_words = ' '.join(current_chunk[-overlap:]).split()
                current_chunk = overlap_words
                current_length = len(overlap_words)
            
            current_chunk.append(sentence)
            current_length += sentence_length
        
        # Add the last chunk if not empty
        if current_chunk:
            chunks.append({
                'text': ' '.join(current_chunk),
                'metadata': {
                    'chunk_type': 'text',
                    'word_count': current_length
                }
            })
            
        return chunks
    
    def _extract_pdf(self, file_path: str) -> str:
        """Extract text from PDF files."""
        try:
            import PyPDF2
            
            text = []
            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                for page in reader.pages:
                    text.append(page.extract_text() or '')
            return '\n'.join(text)
            
        except ImportError:
            raise ImportError("PyPDF2 is required for PDF extraction. Install with: pip install pypdf2")
    
    def _extract_epub(self, file_path: str) -> str:
        """Extract text from EPUB files."""
        try:
            import ebooklib
            from ebooklib import epub
            from bs4 import BeautifulSoup
            
            book = epub.read_epub(file_path)
            text = []
            
            for item in book.get_items():
                if item.get_type() == ebooklib.ITEM_DOCUMENT:
                    soup = BeautifulSoup(item.get_content(), 'html.parser')
                    text.append(soup.get_text())
                    
            return '\n\n'.join(text)
            
        except ImportError:
            raise ImportError("EbookLib and BeautifulSoup4 are required for EPUB extraction. Install with: pip install ebooklib beautifulsoup4")
    
    def _extract_text(self, file_path: str) -> str:
        """Extract text from plain text files."""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()
        except UnicodeDecodeError:
            # Try with different encodings if UTF-8 fails
            try:
                with open(file_path, 'r', encoding='latin-1') as file:
                    return file.read()
            except Exception as e:
                raise ValueError(f"Failed to read file with any encoding: {e}")

# Example usage
if __name__ == "__main__":
    # Example usage
    processor = DocumentProcessor()
    
    # Process a document
    try:
        result = processor.process_document("example.pdf", {"source": "example"})
        print(f"Processed {len(result['chunks'])} chunks")
        print(f"First chunk: {result['chunks'][0]['text'][:200]}...")
    except Exception as e:
        print(f"Error processing document: {e}")
