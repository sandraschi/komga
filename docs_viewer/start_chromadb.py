from chromadb.config import Settings
from chromadb.server import Server
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
    
    # Start the server
    server = Server(settings)
    print(f"Starting ChromaDB server on http://localhost:8000")
    print(f"Data directory: {data_dir}")
    print("Press Ctrl+C to stop the server")
    
    # Keep the server running
    try:
        while True:
            pass
    except KeyboardInterrupt:
        print("\nStopping ChromaDB server...")

if __name__ == "__main__":
    main()
