import os
from pathlib import Path

# Define the directory structure
dirs = [
    "core",
    "processing",
    "retrieval",
    "analysis",
    "models",
    "utils"
]

# Create directories
base_dir = Path(__file__).parent
for d in dirs:
    dir_path = base_dir / d
    dir_path.mkdir(exist_ok=True)
    print(f"Created directory: {dir_path}")

# Create __init__.py files
for root, dirs, _ in os.walk(base_dir):
    for d in dirs:
        init_file = Path(root) / d / "__init__.py"
        init_file.touch(exist_ok=True)
        print(f"Created file: {init_file}")

print("\nDirectory structure created successfully!")
