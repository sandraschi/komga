#!/usr/bin/env python3
"""
Komga RAG - Main Entry Point

This module serves as the main entry point for the Komga RAG system.
It initializes the FastAPI application and starts the server.
"""

import uvicorn
import logging
import argparse
from pathlib import Path
from typing import Optional

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("rag_service.log")
    ]
)
logger = logging.getLogger(__name__)

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Komga RAG System")
    
    # Server settings
    parser.add_argument("--host", type=str, default="0.0.0.0",
                      help="Host to bind the server to")
    parser.add_argument("--port", type=int, default=8000,
                      help="Port to bind the server to")
    parser.add_argument("--workers", type=int, default=1,
                      help="Number of worker processes")
    
    # Configuration
    parser.add_argument("--config", type=str, default="config.yaml",
                      help="Path to configuration file")
    
    # Debug settings
    parser.add_argument("--debug", action="store_true",
                      help="Enable debug mode")
    parser.add_argument("--reload", action="store_true",
                      help="Enable auto-reload")
    
    return parser.parse_args()

def main():
    """Main entry point for the Komga RAG system."""
    args = parse_args()
    
    # Import here to avoid loading everything when just showing help
    from rag.api import create_app
    
    # Create the FastAPI application
    app = create_app(config_path=args.config)
    
    # Log startup information
    logger.info(f"Starting Komga RAG service on {args.host}:{args.port}")
    logger.info(f"Debug mode: {'ON' if args.debug else 'OFF'}")
    logger.info(f"Auto-reload: {'ON' if args.reload else 'OFF'}")
    
    # Start the server
    uvicorn.run(
        "rag.api:app",
        host=args.host,
        port=args.port,
        workers=args.workers,
        reload=args.reload,
        log_level="debug" if args.debug else "info",
        factory=True
    )

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("Shutting down Komga RAG service...")
    except Exception as e:
        logger.error(f"Error starting Komga RAG service: {e}", exc_info=True)
        raise
