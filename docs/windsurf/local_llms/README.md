# Local LLM Integration with Windsurf

This guide covers setting up and using local LLMs with Windsurf IDE, including configuration, troubleshooting, and optimization.

## Table of Contents

- [Introduction](#introduction)
- [Supported Models](#supported-models)
- [Installation](#installation)
- [Configuration](#configuration)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)
- [Advanced Usage](#advanced-usage)
- [Community Resources](#community-resources)

## Introduction

Running LLMs locally with Windsurf offers several benefits:
- **Privacy**: Your code never leaves your machine
- **No Rate Limits**: No API restrictions
- **Offline Use**: Work without internet connectivity
- **Custom Models**: Use specialized or fine-tuned models

## Supported Models

### Officially Supported
- Llama 2 (7B, 13B, 70B)
- Mistral (7B, 13B)
- CodeLlama (7B, 13B, 34B)

### Community-Tested
- WizardCoder
- StarCoder
- GPT4All

### Experimental
- Custom fine-tuned models
- Quantized models

## Installation

### Prerequisites
- Python 3.8+
- pip
- Git
- CUDA (for GPU acceleration)

### Windows

1. Install Python from [python.org](https://www.python.org/downloads/)
2. Install CUDA Toolkit (if using NVIDIA GPU)
3. Install Git for Windows
4. Install required packages:
   ```powershell
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
   pip install -U vllm
   ```

### macOS

1. Install Homebrew:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. Install dependencies:
   ```bash
   brew install python@3.10 git
   pip3 install torch torchvision torchaudio
   pip3 install -U vllm
   ```

### Linux

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3-pip python3-venv git

# Install PyTorch with CUDA support
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install vLLM
pip3 install -U vllm
```

## Configuration

### Basic Setup

1. Create a configuration file at `~/.windsurf/config.json`:
   ```json
   {
     "local_llm": {
       "enabled": true,
       "model_path": "~/models/llama-2-7b-chat",
       "device": "cuda",
       "max_tokens": 2048,
       "temperature": 0.7
     }
   }
   ```

2. Download a model (example using Hugging Face):
   ```bash
   # Install huggingface_hub if needed
   pip install huggingface_hub
   
   # Download model (requires authentication)
   huggingface-cli download meta-llama/Llama-2-7b-chat-hf --local-dir ~/models/llama-2-7b-chat
   ```

### Advanced Configuration

```json
{
  "local_llm": {
    "enabled": true,
    "model_path": "~/models/llama-2-13b-chat",
    "device": "cuda:0",
    "max_tokens": 4096,
    "temperature": 0.7,
    "top_p": 0.9,
    "top_k": 40,
    "repetition_penalty": 1.1,
    "num_gpus": 2,
    "quantization": "int8",
    "trust_remote_code": true
  }
}
```

## Performance Optimization

### Hardware Recommendations

| Component      | Minimum       | Recommended   | High-End     |
|---------------|---------------|---------------|--------------|
| CPU           | 8 cores       | 16 cores      | 32+ cores    |
| RAM           | 16GB          | 32GB          | 64GB+        |
| GPU           | NVIDIA 8GB    | NVIDIA 24GB   | Multi-GPU    |
| Storage       | 100GB SSD     | 500GB NVMe    | 1TB+ NVMe    |

### Quantization

Reduce model size and increase speed with quantization:

```bash
# Convert model to 8-bit
python -m vllm.entrypoints.quantize \
  --model ~/models/llama-2-7b-chat \
  --output ~/models/llama-2-7b-chat-int8 \
  --dtype int8
```

### Batch Processing

Enable batch processing in config:

```json
{
  "local_llm": {
    "batch_size": 8,
    "max_batch_tokens": 4096
  }
}
```

## Troubleshooting

### Common Issues

1. **Out of Memory (OOM) Errors**
   - Reduce `max_tokens`
   - Enable quantization
   - Use a smaller model
   - Close other memory-intensive applications

2. **Slow Performance**
   - Enable GPU acceleration
   - Use quantization
   - Increase batch size
   - Check for background processes

3. **Model Loading Failures**
   - Verify model path
   - Check file permissions
   - Ensure sufficient disk space
   - Validate model files

### Logs

Check logs for detailed error information:

- Windows: `%APPDATA%\Windsurf\logs\local_llm.log`
- macOS: `~/Library/Logs/Windsurf/local_llm.log`
- Linux: `~/.cache/Windsurf/logs/local_llm.log`

## Advanced Usage

### Custom Models

To use a custom model:

1. Place model files in `~/.windsurf/models/custom-model`
2. Update config:
   ```json
   {
     "local_llm": {
       "model_path": "~/.windsurf/models/custom-model",
       "model_type": "custom"
     }
   }
   ```

### API Server

Run a local API server:

```bash
python -m vllm.entrypoints.api_server \
  --model ~/models/llama-2-7b-chat \
  --port 8000 \
  --gpu-memory-utilization 0.9
```

Configure Windsurf to use the local API:

```json
{
  "local_llm": {
    "api_url": "http://localhost:8000/v1"
  }
}
```

## Community Resources

### Helpful Links
- [vLLM Documentation](https://vllm.ai/)
- [Hugging Face Models](https://huggingface.co/models)
- [Llama.cpp](https://github.com/ggerganov/llama.cpp)
- [Text Generation WebUI](https://github.com/oobabooga/text-generation-webui)

### Community Models
- [TheBloke's Models](https://huggingface.co/TheBloke)
- [Open-Orca](https://huggingface.co/Open-Orca)
- [WizardLM](https://huggingface.co/WizardLM)

## Contributing

Found an issue or have a suggestion? Please open an issue or submit a pull request.

## License

This documentation is provided under the MIT License.