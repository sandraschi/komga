import requests

try:
    response = requests.get('http://localhost:8000/api/v1/heartbeat', timeout=5)
    print(f"ChromaDB server is running. Status code: {response.status_code}")
    print(f"Response: {response.text}")
except requests.exceptions.RequestException as e:
    print(f"Could not connect to ChromaDB server: {e}")
    print("Make sure you've started the ChromaDB server by running 'python start_chromadb.py' in a separate terminal")
