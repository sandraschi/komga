# Komga RAG System

A high-performance Retrieval-Augmented Generation (RAG) system for the Komga digital media server. This system enables semantic search, document analysis, and AI-powered insights across your entire digital library.

## Features

- **Semantic Search**: Find content using natural language queries
- **Multi-Format Support**: Process PDFs, EPUBs, and other document formats
- **Thematic Analysis**: Automatically identify and track themes across documents
- **Scalable Architecture**: Designed to handle libraries with 20,000+ documents
- **RESTful API**: Easy integration with Komga and other services
- **Docker Support**: Containerized deployment for easy setup

## Prerequisites

- Python 3.9+
- Docker and Docker Compose (recommended)
- 8GB+ RAM (16GB+ recommended for large libraries)
- 100GB+ free disk space (for vector embeddings)

## Main Entry Point

The main entry point for the Komga RAG system is `main.py`, which provides a command-line interface to start the service with various configuration options.

### Command-Line Options

```
usage: python -m rag.main [-h] [--host HOST] [--port PORT] [--workers WORKERS]
                        [--config CONFIG] [--debug] [--reload]

Komga RAG System

options:
  -h, --help         show this help message and exit
  --host HOST         Host to bind the server to (default: 0.0.0.0)
  --port PORT         Port to bind the server to (default: 8000)
  --workers WORKERS   Number of worker processes (default: 1)
  --config CONFIG     Path to configuration file (default: config.yaml)
  --debug             Enable debug mode (default: False)
  --reload            Enable auto-reload (default: False)
```

### Usage Examples

1. **Basic Usage**:
   ```bash
   python -m rag.main
   ```

2. **Development Mode** (with auto-reload and debug logging):
   ```bash
   python -m rag.main --debug --reload
   ```

3. **Production Deployment** (4 workers, custom port):
   ```bash
   python -m rag.main --host 0.0.0.0 --port 8000 --workers 4
   ```

4. **Custom Configuration**:
   ```bash
   python -m rag.main --config /path/to/custom_config.yaml
   ```

### Logging

The application logs to both console and `rag_service.log` in the current directory. Logs include:
- Timestamps
- Log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- Module names
- Detailed error messages

### Error Handling

- Graceful shutdown on keyboard interrupt (Ctrl+C)
- Detailed error logging for unhandled exceptions
- HTTP error responses with appropriate status codes

## Quick Start

### Using Docker (Recommended)


```bash
# Clone the repository
git clone https://github.com/your-org/komga-rag.git
cd komga-rag

# Copy and edit the configuration
cp config.example.yaml config.yaml
nano config.yaml

# Build and start the services
docker-compose up -d --build

# Check the logs
docker-compose logs -f
```

The API will be available at `http://localhost:8000`

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/your-org/komga-rag.git
cd komga-rag

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -e ".[dev]"

# Install pre-commit hooks
pre-commit install

# Run the API
uvicorn rag.api.main:app --reload
```

## Configuration

Edit `config.yaml` to customize the system behavior. Key configurations include:

- `document_processing`: Chunking and text processing settings
- `embedding`: Model selection and batch processing
- `vector_store`: ChromaDB configuration
- `retrieval`: Search and ranking parameters
- `analysis`: Theme and content analysis settings

## API Documentation

Once running, access the interactive API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Development

### Code Style

This project uses:
- Black for code formatting
- isort for import sorting
- flake8 for linting
- mypy for type checking

Run all code quality checks:

```bash
pre-commit run --all-files
```

### Testing

Run the test suite:

```bash
pytest
```

Generate coverage report:

```bash
pytest --cov=rag --cov-report=term-missing
```

## Performance Tuning

For large libraries (10,000+ documents):

1. **Hardware**:
   - CPU: 8+ cores
   - RAM: 32GB+
   - Storage: Fast SSD/NVMe

2. **Configuration**:
   - Increase `max_workers` based on CPU cores
   - Adjust `batch_size` based on available memory
   - Enable GPU acceleration if available

## Monitoring

Basic monitoring is available at `http://localhost:8000/metrics` (Prometheus format).

For advanced monitoring, uncomment the Prometheus and Grafana services in `docker-compose.yml`.

## Backup and Recovery

Regular backups are stored in `data/backups` by default. To restore from a backup:

```bash
# Stop the service
docker-compose down

# Restore the backup
cp -r data/backups/latest/* data/chromadb/

# Restart the service
docker-compose up -d
```

## License

MIT License - See [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details.

## Support

For support, please open an issue in the GitHub repository or join our [Discord community](https://discord.gg/your-invite).

---

*Documentation generated: May 2025*  
*Version: 0.1.0*
