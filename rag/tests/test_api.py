"""
Tests for the Komga RAG API.
"""

import pytest
from fastapi.testclient import TestClient
from rag.api import app, __version__

# Test client
client = TestClient(app)

def test_health_check():
    """Test the health check endpoint."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == __version__

def test_process_document():
    """Test document processing endpoint."""
    test_file = "tests/data/sample.pdf"
    
    # Create test file if it doesn't exist
    import os
    os.makedirs(os.path.dirname(test_file), exist_ok=True)
    if not os.path.exists(test_file):
        with open(test_file, "wb") as f:
            f.write(b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R/Parent 2 0 R>>endobj 4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj 5 0 obj<</Length 44>>stream
BT/F1 24 Tf 100 700 Td(Hello, World!)Tj ET
endstream endobj
xref
0 6
0000000000 65535 f 
0000000015 00000 n 
0000000066 00000 n 
0000000122 00000 n 
0000000203 00000 n 
0000000240 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
354
%%EOF")
    
    with open(test_file, "rb") as f:
        response = client.post(
            "/api/v1/documents",
            files={"file": ("sample.pdf", f, "application/pdf")},
            data={"metadata": "{}"}
        )
    
    assert response.status_code == 200
    data = response.json()
    assert "document_id" in data
    assert data["status"] == "processed"
    assert data["chunks_processed"] > 0

def test_search():
    """Test the search endpoint."""
    test_query = {"query": "test search", "limit": 3}
    response = client.post("/api/v1/search", json=test_query)
    
    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    
    # If we have results, check their structure
    if results:
        for result in results:
            assert "id" in result
            assert "text" in result
            assert "score" in result

def test_analyze_themes():
    """Test the theme analysis endpoint."""
    test_text = "Artificial intelligence is transforming industries across the world. " \
                "Machine learning algorithms are becoming increasingly sophisticated."
    
    response = client.get(
        "/api/v1/themes",
        params={"text": test_text}
    )
    
    assert response.status_code == 200
    themes = response.json()
    assert isinstance(themes, list)
    
    # If we have themes, check their structure
    if themes:
        for theme in themes:
            assert "theme" in theme
            assert "confidence" in theme
            assert "mentions" in theme

def test_invalid_endpoint():
    """Test that invalid endpoints return 404."""
    response = client.get("/api/v1/nonexistent")
    assert response.status_code == 404

# Fixture for test data
@pytest.fixture(scope="session")
def test_pdf_file(tmp_path_factory):
    """Create a test PDF file."""
    pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R/Parent 2 0 R>>endobj 4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj 5 0 obj<</Length 44>>stream
BT/F1 24 Tf 100 700 Td(Test PDF Content)Tj ET
endstream endobj
xref
0 6
0000000000 65535 f 
0000000015 00000 n 
0000000066 00000 n 
0000000122 00000 n 
0000000203 00000 n 
0000000240 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
354
%%EOF"
    
    fn = tmp_path_factory.mktemp("data") / "test.pdf"
    fn.write_bytes(pdf_content)
    return str(fn)
