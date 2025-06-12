import uvicorn
import chromadb
from chromadb.config import Settings
import os

def main():
    # Create the data directory if it doesn't exist
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chroma_data')
    os.makedirs(data_dir, exist_ok=True)
    
    # Configure ChromaDB settings
    settings = Settings(
        chroma_db_impl="duckdb+parquet",
        persist_directory=data_dir,
        anonymized_telemetry=False
    )
    
    # Initialize the ChromaDB client
    client = chromadb.Client(settings)
    
    # Start the FastAPI server with uvicorn
    uvicorn.run(
        "chromadb.app:app",
        host="0.0.0.0",
        port=8000,
        log_level="info",
        reload=True
    )

if __name__ == "__main__":
    main()
