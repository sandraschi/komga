import http.client
import json

def check_chromadb_server():
    try:
        conn = http.client.HTTPConnection("localhost", 8000, timeout=5)
        conn.request("GET", "/api/v1/heartbeat")
        response = conn.getresponse()
        print(f"Status: {response.status}")
        print(f"Response: {response.read().decode()}")
        conn.close()
    except Exception as e:
        print(f"Error connecting to ChromaDB server: {e}")
        print("Make sure the ChromaDB server is running on port 8000")

if __name__ == "__main__":
    print("Checking ChromaDB server status...")
    check_chromadb_server()
