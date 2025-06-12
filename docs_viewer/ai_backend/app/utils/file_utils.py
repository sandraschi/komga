import os
import hashlib
import mimetypes
from pathlib import Path
from typing import Optional, BinaryIO, Tuple, Dict, Any
import magic
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class FileUtils:
    """Utility class for file operations"""
    
    @staticmethod
    def get_file_hash(file_path: Path, algorithm: str = 'sha256') -> str:
        """
        Calculate the hash of a file
        
        Args:
            file_path: Path to the file
            algorithm: Hashing algorithm to use (default: sha256)
            
        Returns:
            Hex digest of the file hash
        """
        hash_func = hashlib.new(algorithm)
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b''):
                hash_func.update(chunk)
        return hash_func.hexdigest()
    
    @staticmethod
    def get_file_info(file_path: Path) -> Dict[str, Any]:
        """
        Get detailed information about a file
        
        Args:
            file_path: Path to the file
            
        Returns:
            Dictionary containing file metadata
        """
        try:
            file_path = Path(file_path)
            stat = file_path.stat()
            
            # Initialize mime type detection
            mime = magic.Magic(mime=True)
            
            return {
                'file_name': file_path.name,
                'file_path': str(file_path.absolute()),
                'file_size': stat.st_size,
                'file_extension': file_path.suffix.lower(),
                'mime_type': mime.from_file(str(file_path)),
                'created_at': datetime.fromtimestamp(stat.st_ctime),
                'modified_at': datetime.fromtimestamp(stat.st_mtime),
                'is_file': file_path.is_file(),
                'is_dir': file_path.is_dir(),
                'is_symlink': file_path.is_symlink(),
                'file_hash': FileUtils.get_file_hash(file_path) if file_path.is_file() else None
            }
        except Exception as e:
            logger.error(f"Error getting file info for {file_path}: {e}")
            raise
    
    @staticmethod
    def ensure_directory_exists(directory: Path) -> None:
        """
        Ensure that a directory exists, creating it if necessary
        
        Args:
            directory: Path to the directory
        """
        try:
            directory = Path(directory)
            if not directory.exists():
                directory.mkdir(parents=True, exist_ok=True)
                logger.info(f"Created directory: {directory}")
        except Exception as e:
            logger.error(f"Error ensuring directory exists {directory}: {e}")
            raise
    
    @staticmethod
    def get_safe_filename(filename: str) -> str:
        """
        Convert a filename to a safe string that can be used as a filename
        
        Args:
            filename: Original filename
            
        Returns:
            Safe filename string
        """
        # Keep only alphanumeric, dots, hyphens, and underscores
        import re
        filename = str(filename).strip()
        filename = re.sub(r'[^\w\-_. ]', '_', filename)
        return filename
    
    @staticmethod
    def save_uploaded_file(upload_file: BinaryIO, destination: Path, chunk_size: int = 8192) -> Path:
        """
        Save an uploaded file to the specified destination
        
        Args:
            upload_file: File-like object to save
            destination: Destination path (can be directory or full path)
            chunk_size: Size of chunks to read/write at a time
            
        Returns:
            Path to the saved file
        """
        try:
            destination = Path(destination)
            
            # If destination is a directory, use the original filename
            if destination.is_dir():
                filename = getattr(upload_file, 'filename', 'uploaded_file')
                destination = destination / FileUtils.get_safe_filename(filename)
            
            # Ensure parent directory exists
            FileUtils.ensure_directory_exists(destination.parent)
            
            # Save the file in chunks to handle large files
            with open(destination, 'wb') as buffer:
                while True:
                    chunk = upload_file.read(chunk_size)
                    if not chunk:
                        break
                    buffer.write(chunk)
            
            logger.info(f"Saved uploaded file to {destination}")
            return destination
            
        except Exception as e:
            logger.error(f"Error saving uploaded file to {destination}: {e}")
            raise
    
    @staticmethod
    def get_mime_type(file_path: Path) -> str:
        """
        Get the MIME type of a file
        
        Args:
            file_path: Path to the file
            
        Returns:
            MIME type string
        """
        try:
            mime = magic.Magic(mime=True)
            return mime.from_file(str(file_path))
        except Exception as e:
            logger.warning(f"Could not determine MIME type for {file_path}: {e}")
            # Fall back to mimetypes.guess_type
            mime_type, _ = mimetypes.guess_type(str(file_path))
            return mime_type or 'application/octet-stream'
    
    @staticmethod
    def is_supported_document(file_path: Path) -> bool:
        """
        Check if a file is a supported document type
        
        Args:
            file_path: Path to the file
            
        Returns:
            True if the file type is supported, False otherwise
        """
        mime_type = FileUtils.get_mime_type(file_path)
        if not mime_type:
            return False
            
        supported_types = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/markdown',
            'text/csv',
            'text/html',
            'application/epub+zip',
            'image/jpeg',
            'image/png',
            'image/tiff',
        ]
        
        return any(mime_type.startswith(t) for t in supported_types)
    
    @staticmethod
    def get_file_extension(mime_type: str) -> str:
        """
        Get file extension from MIME type
        
        Args:
            mime_type: MIME type string
            
        Returns:
            File extension with leading dot (e.g., '.pdf')
        """
        # Common MIME type to extension mapping
        mime_to_extension = {
            'application/pdf': '.pdf',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/vnd.ms-excel': '.xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
            'application/vnd.ms-powerpoint': '.ppt',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
            'text/plain': '.txt',
            'text/markdown': '.md',
            'text/csv': '.csv',
            'text/html': '.html',
            'application/epub+zip': '.epub',
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/tiff': '.tiff',
        }
        
        return mime_to_extension.get(mime_type.lower(), '.bin')
