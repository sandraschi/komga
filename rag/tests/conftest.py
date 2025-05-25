"""
Pytest configuration and fixtures for testing the Komga RAG system.
"""

import pytest
from fastapi.testclient import TestClient
from rag.api import app
import tempfile
import shutil
from pathlib import Path

@pytest.fixture(scope="session")
def test_client():
    """Create a test client for the FastAPI application."""
    return TestClient(app)

@pytest.fixture(scope="session")
def temp_data_dir():
    """Create a temporary directory for test data."""
    temp_dir = tempfile.mkdtemp(prefix="komga_rag_test_")
    yield Path(temp_dir)
    shutil.rmtree(temp_dir, ignore_errors=True)

@pytest.fixture(scope="module")
def sample_pdf_content():
    """Return sample PDF content as bytes."""
    return (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R/Parent 2 0 R>>endobj\n"
        b"4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
        b"5 0 obj<</Length 44>>stream\n"
        b"BT/F1 24 Tf 100 700 Td(Test PDF Content)Tj ET\n"
        b"endstream endobj\n"
        b"xref\n"
        b"0 6\n"
        b"0000000000 65535 f \n"
        b"0000000015 00000 n \n"
        b"0000000066 00000 n \n"
        b"0000000122 00000 n \n"
        b"0000000203 00000 n \n"
        b"0000000240 00000 n \n"
        b"trailer<</Size 6/Root 1 0 R>>\n"
        b"startxref\n"
        b"354\n"
        b"%%EOF"
    )

@pytest.fixture
def sample_text():
    """Return sample text for testing."""
    return (
        "Artificial intelligence is transforming industries across the world. "
        "Machine learning algorithms are becoming increasingly sophisticated."
    )

@pytest.fixture
def sample_metadata():
    """Return sample metadata for testing."""
    return {
        "title": "Test Document",
        "author": "Test Author",
        "source": "test",
        "tags": ["test", "sample"]
    }
