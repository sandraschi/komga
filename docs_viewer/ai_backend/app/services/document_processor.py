import os
import mimetypes
from pathlib import Path
from typing import Dict, List, Optional, Tuple, BinaryIO, Any
import logging
import magic
from datetime import datetime

# Document processing libraries
try:
    import PyPDF2
    from docx import Document as DocxDocument
    import docx2txt
    from pptx import Presentation
    import pandas as pd
    from PIL import Image
    import pytesseract
    from langchain.document_loaders import (
        PyPDFLoader,
        Docx2txtLoader,
        TextLoader,
        CSVLoader,
        UnstructuredFileLoader,
        UnstructuredPowerPointLoader,
        UnstructuredWordDocumentLoader,
        UnstructuredMarkdownLoader,
        UnstructuredHTMLLoader,
        UnstructuredEmailLoader,
        UnstructuredExcelLoader,
        UnstructuredEPubLoader,
        UnstructuredImageLoader,
    )
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain.schema import Document as LangchainDocument
    from langchain.embeddings import HuggingFaceEmbeddings, OpenAIEmbeddings
    from langchain.vectorstores import Chroma
    
    DOC_LOADERS = {
        '.pdf': PyPDFLoader,
        '.docx': Docx2txtLoader,
        '.doc': Docx2txtLoader,
        '.txt': TextLoader,
        '.csv': CSVLoader,
        '.pptx': UnstructuredPowerPointLoader,
        '.ppt': UnstructuredPowerPointLoader,
        '.md': UnstructuredMarkdownLoader,
        '.html': UnstructuredHTMLLoader,
        '.htm': UnstructuredHTMLLoader,
        '.eml': UnstructuredEmailLoader,
        '.xls': UnstructuredExcelLoader,
        '.xlsx': UnstructuredExcelLoader,
        '.epub': UnstructuredEPubLoader,
        '.jpg': UnstructuredImageLoader,
        '.jpeg': UnstructuredImageLoader,
        '.png': UnstructuredImageLoader,
    }
    
    # Default loader for other file types
    DEFAULT_LOADER = UnstructuredFileLoader
    
    # Initialize text splitter
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )
    
    # Initialize embeddings
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
except ImportError as e:
    logging.warning(f"Some document processing libraries not available: {e}")
    DOC_LOADERS = {}
    DEFAULT_LOADER = None

class DocumentProcessor:
    """Handles document processing including text extraction, chunking, and embedding"""
    
    def __init__(self, upload_dir: str, chroma_db_path: str):
        self.upload_dir = Path(upload_dir)
        self.chroma_db_path = Path(chroma_db_path)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.chroma_db_path.mkdir(parents=True, exist_ok=True)
        self.mime = magic.Magic(mime=True)
    
    def save_uploaded_file(self, file: BinaryIO, filename: str) -> Path:
        """Save uploaded file to the upload directory"""
        file_path = self.upload_dir / filename
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save file
        with open(file_path, 'wb') as buffer:
            buffer.write(file.read())
            
        return file_path
    
    def get_file_info(self, file_path: Path) -> Dict[str, Any]:
        """Get file information including MIME type and size"""
        return {
            'file_name': file_path.name,
            'file_path': str(file_path.absolute()),
            'file_size': file_path.stat().st_size,
            'mime_type': self.mime.from_file(str(file_path)),
            'file_extension': file_path.suffix.lower(),
            'created_at': datetime.fromtimestamp(file_path.stat().st_ctime),
            'modified_at': datetime.fromtimestamp(file_path.stat().st_mtime),
        }
    
    def load_document(self, file_path: Path) -> List[LangchainDocument]:
        """Load document using appropriate loader"""
        file_path = Path(file_path)
        ext = file_path.suffix.lower()
        
        try:
            if ext in DOC_LOADERS:
                loader = DOC_LOADERS[ext](str(file_path))
            else:
                loader = DEFAULT_LOADER(str(file_path))
                
            return loader.load()
            
        except Exception as e:
            logging.error(f"Error loading document {file_path}: {e}")
            raise
    
    def split_document(self, documents: List[LangchainDocument]) -> List[LangchainDocument]:
        """Split document into chunks"""
        return text_splitter.split_documents(documents)
    
    def process_document(self, file_path: Path) -> Dict[str, Any]:
        """Process a document and return chunks with embeddings"""
        try:
            # Load document
            documents = self.load_document(file_path)
            
            # Split into chunks
            chunks = self.split_document(documents)
            
            # Create or load Chroma collection
            collection_name = file_path.stem.lower().replace(' ', '_')
            chroma_db = Chroma(
                persist_directory=str(self.chroma_db_path),
                embedding_function=embeddings,
                collection_name=collection_name
            )
            
            # Add documents to Chroma
            chroma_db.add_documents(chunks)
            chroma_db.persist()
            
            # Prepare result
            result = {
                'file_path': str(file_path),
                'file_name': file_path.name,
                'chunk_count': len(chunks),
                'collection_name': collection_name,
                'chunks': [{
                    'page_content': chunk.page_content,
                    'metadata': chunk.metadata
                } for chunk in chunks[:10]]  # Return first 10 chunks as sample
            }
            
            return result
            
        except Exception as e:
            logging.error(f"Error processing document {file_path}: {e}")
            raise
    
    def search_documents(self, query: str, collection_name: str = None, k: int = 5) -> List[Dict[str, Any]]:
        """Search for similar documents"""
        try:
            chroma_db = Chroma(
                persist_directory=str(self.chroma_db_path),
                embedding_function=embeddings,
                collection_name=collection_name
            )
            
            results = chroma_db.similarity_search(query, k=k)
            
            return [{
                'content': doc.page_content,
                'metadata': doc.metadata,
                'score': 0.0  # Placeholder, Chroma doesn't return scores by default
            } for doc in results]
            
        except Exception as e:
            logging.error(f"Error searching documents: {e}")
            raise

# Example usage
if __name__ == "__main__":
    import tempfile
    
    # Initialize processor
    with tempfile.TemporaryDirectory() as temp_dir:
        processor = DocumentProcessor(
            upload_dir=os.path.join(temp_dir, "uploads"),
            chroma_db_path=os.path.join(temp_dir, "chroma_db")
        )
        
        # Example: Process a test file
        test_file = Path("example.txt")
        with open(test_file, 'w') as f:
            f.write("This is a test document.\n" * 100)  # Create a test file
            
        try:
            # Process the document
            result = processor.process_document(test_file)
            print(f"Processed {result['file_name']} into {result['chunk_count']} chunks")
            
            # Search in the document
            query = "test document"
            search_results = processor.search_documents(query, collection_name=result['collection_name'])
            print(f"Found {len(search_results)} results for '{query}':")
            for i, res in enumerate(search_results, 1):
                print(f"{i}. {res['content'][:100]}...")
                
        finally:
            # Clean up test file
            test_file.unlink()
