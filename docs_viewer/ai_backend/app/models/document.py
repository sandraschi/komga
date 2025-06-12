from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import List, Optional, Dict, Any
import uuid

from app.core.database import Base

# Association table for many-to-many relationship between documents and collections
document_collection = Table(
    'document_collection',
    Base.metadata,
    Column('document_id', String(36), ForeignKey('documents.id')),
    Column('collection_id', String(36), ForeignKey('collections.id'))
)

class Document(Base):
    """Document model for storing document metadata"""
    __tablename__ = "documents"
    
    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String(512), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)  # in bytes
    file_type = Column(String(50), nullable=False)
    mime_type = Column(String(100), nullable=False)
    
    # Document metadata
    author = Column(String(255), nullable=True)
    source = Column(String(255), nullable=True)
    language = Column(String(10), default="en")
    page_count = Column(Integer, nullable=True)
    
    # Processing status
    is_processed = Column(Boolean, default=False)
    processing_error = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    
    # Relationships
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    collections = relationship("Collection", secondary=document_collection, back_populates="documents")
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "file_name": self.file_name,
            "file_size": self.file_size,
            "file_type": self.file_type,
            "mime_type": self.mime_type,
            "author": self.author,
            "source": self.source,
            "language": self.language,
            "page_count": self.page_count,
            "is_processed": self.is_processed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
        }

class DocumentChunk(Base):
    """Model for storing chunks of documents with embeddings"""
    __tablename__ = "document_chunks"
    
    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    
    # Chunk content and metadata
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, nullable=True)
    section = Column(String(100), nullable=True)
    
    # Embedding vector (stored as JSON for compatibility)
    embedding = Column(JSON, nullable=True)
    
    # Metadata
    metadata_ = Column("metadata", JSON, default={})
    
    # Relationships
    document = relationship("Document", back_populates="chunks")
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "document_id": self.document_id,
            "chunk_index": self.chunk_index,
            "page_number": self.page_number,
            "section": self.section,
            "content": self.content,
            "metadata": self.metadata_
        }

class Collection(Base):
    """Collection model for grouping documents"""
    __tablename__ = "collections"
    
    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    documents = relationship("Document", secondary=document_collection, back_populates="collections")
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "is_public": self.is_public,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "document_count": len(self.documents)
        }
