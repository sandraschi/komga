import requests
import socket

def check_port(host, port):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception as e:
        print(f"Error checking port: {e}")
        return False

def check_chromadb():
    host = "localhost"
    port = 8000
    
    print(f"Checking if port {port} is open...")
    if check_port(host, port):
        print(f"Port {port} is open. Trying to connect to ChromaDB...")
        try:
            response = requests.get(f"http://{host}:{port}/api/v1/heartbeat", timeout=5)
            print(f"ChromaDB server is running. Status code: {response.status_code}")
            print(f"Response: {response.text}")
        except requests.exceptions.RequestException as e:
            print(f"Could not connect to ChromaDB server: {e}")
    else:
        print(f"Port {port} is not open. Make sure ChromaDB server is running.")
        print("Start the server by running: python start_chromadb_uvicorn.py")

if __name__ == "__main__":
    check_chromadb()
