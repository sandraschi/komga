import os
import logging
from typing import List, Dict, Any, Optional, Union
import numpy as np
from pydantic import BaseModel, Field
from enum import Enum
import json

logger = logging.getLogger(__name__)

class EmbeddingProvider(str, Enum):
    """Supported embedding providers"""
    OPENAI = "openai"
    HUGGINGFACE = "huggingface"
    SENTENCE_TRANSFORMERS = "sentence-transformers"
    COHERE = "cohere"
    VOYAGE = "voyage"

class EmbeddingModelConfig(BaseModel):
    """Configuration for an embedding model"""
    provider: EmbeddingProvider = Field(..., description="The embedding provider")
    model_name: str = Field(..., description="Name of the model")
    dimensions: int = Field(..., description="Dimensionality of the embeddings")
    max_seq_length: int = Field(512, description="Maximum sequence length")
    batch_size: int = Field(32, description="Batch size for processing")
    api_key_env: Optional[str] = Field(None, description="Environment variable for API key")
    additional_params: Dict[str, Any] = Field(default_factory=dict, description="Additional model parameters")

class EmbeddingResult(BaseModel):
    """Result of an embedding operation"""
    embeddings: List[List[float]] = Field(..., description="List of embedding vectors")
    model: str = Field(..., description="Name of the model used")
    dimensions: int = Field(..., description="Dimensionality of the embeddings")
    token_count: Optional[int] = Field(None, description="Number of tokens processed")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

class BaseEmbeddingService:
    """Base class for embedding services"""
    
    def __init__(self, config: EmbeddingModelConfig):
        """Initialize the embedding service"""
        self.config = config
        self.model_name = config.model_name
        self.dimensions = config.dimensions
        self.max_seq_length = config.max_seq_length
        self.batch_size = config.batch_size
        self._validate_config()
        
    def _validate_config(self):
        """Validate the configuration"""
        if self.config.api_key_env and self.config.api_key_env not in os.environ:
            logger.warning(f"API key environment variable {self.config.api_key_env} not set")
    
    def get_embedding(self, text: str) -> List[float]:
        """Get embedding for a single text"""
        return self.get_embeddings([text]).embeddings[0]
    
    def get_embeddings(self, texts: List[str]) -> EmbeddingResult:
        """Get embeddings for multiple texts"""
        raise NotImplementedError("Subclasses must implement this method")
    
    def get_dimensions(self) -> int:
        """Get the dimensionality of the embeddings"""
        return self.dimensions
    
    def get_model_name(self) -> str:
        """Get the name of the model"""
        return self.model_name

class OpenAIEmbeddingService(BaseEmbeddingService):
    """OpenAI embedding service"""
    
    def __init__(self, config: EmbeddingModelConfig):
        super().__init__(config)
        try:
            from openai import OpenAI
            self.client = OpenAI(api_key=os.environ.get(config.api_key_env or "OPENAI_API_KEY"))
        except ImportError:
            raise ImportError("Please install openai package: pip install openai")
    
    def get_embeddings(self, texts: List[str]) -> EmbeddingResult:
        """Get embeddings using OpenAI API"""
        try:
            # Split into batches
            batches = [texts[i:i + self.batch_size] for i in range(0, len(texts), self.batch_size)]
            all_embeddings = []
            total_tokens = 0
            
            for batch in batches:
                response = self.client.embeddings.create(
                    model=self.model_name,
                    input=batch
                )
                
                batch_embeddings = [item.embedding for item in response.data]
                all_embeddings.extend(batch_embeddings)
                
                # Update token count if available
                if hasattr(response, 'usage') and hasattr(response.usage, 'total_tokens'):
                    total_tokens += response.usage.total_tokens
            
            return EmbeddingResult(
                embeddings=all_embeddings,
                model=self.model_name,
                dimensions=self.dimensions,
                token_count=total_tokens or None
            )
            
        except Exception as e:
            logger.error(f"Error getting OpenAI embeddings: {e}")
            raise

class HuggingFaceEmbeddingService(BaseEmbeddingService):
    """HuggingFace embedding service"""
    
    def __init__(self, config: EmbeddingModelConfig):
        super().__init__(config)
        try:
            from transformers import AutoTokenizer, AutoModel
            import torch
            
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModel.from_pretrained(self.model_name).to(self.device)
            self.model.eval()
            
            # Update dimensions if not set
            if not self.dimensions and hasattr(self.model, 'config'):
                self.dimensions = getattr(self.model.config, 'hidden_size', 768)
                
        except ImportError:
            raise ImportError("Please install transformers and torch: pip install transformers torch")
    
    def _mean_pooling(self, model_output, attention_mask):
        """Mean pooling for sentence embeddings"""
        import torch
        token_embeddings = model_output.last_hidden_state
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)
    
    def get_embeddings(self, texts: List[str]) -> EmbeddingResult:
        """Get embeddings using HuggingFace model"""
        import torch
        
        try:
            # Tokenize
            encoded_input = self.tokenizer(
                texts,
                padding=True,
                truncation=True,
                max_length=self.max_seq_length,
                return_tensors='pt'
            ).to(self.device)
            
            # Get embeddings
            with torch.no_grad():
                model_output = self.model(**encoded_input)
            
            # Apply mean pooling to get sentence embeddings
            embeddings = self._mean_pooling(
                model_output,
                encoded_input['attention_mask']
            )
            
            # Normalize embeddings
            embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)
            
            # Convert to list of lists
            embeddings_list = embeddings.cpu().numpy().tolist()
            
            # Calculate token count
            token_count = encoded_input['input_mask'].sum().item()
            
            return EmbeddingResult(
                embeddings=embeddings_list,
                model=self.model_name,
                dimensions=self.dimensions,
                token_count=token_count
            )
            
        except Exception as e:
            logger.error(f"Error getting HuggingFace embeddings: {e}")
            raise

class SentenceTransformersService(BaseEmbeddingService):
    """Sentence Transformers embedding service"""
    
    def __init__(self, config: EmbeddingModelConfig):
        super().__init__(config)
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(self.model_name)
            
            # Update dimensions if not set
            if not self.dimensions:
                self.dimensions = self.model.get_sentence_embedding_dimension()
                
        except ImportError:
            raise ImportError("Please install sentence-transformers: pip install sentence-transformers")
    
    def get_embeddings(self, texts: List[str]) -> EmbeddingResult:
        """Get embeddings using Sentence Transformers"""
        try:
            # Get embeddings in batches
            all_embeddings = []
            
            for i in range(0, len(texts), self.batch_size):
                batch = texts[i:i + self.batch_size]
                embeddings = self.model.encode(
                    batch,
                    convert_to_numpy=True,
                    normalize_embeddings=True,
                    show_progress_bar=False
                )
                all_embeddings.extend(embeddings.tolist())
            
            return EmbeddingResult(
                embeddings=all_embeddings,
                model=self.model_name,
                dimensions=self.dimensions
            )
            
        except Exception as e:
            logger.error(f"Error getting Sentence Transformers embeddings: {e}")
            raise

class EmbeddingServiceFactory:
    """Factory for creating embedding services"""
    
    @staticmethod
    def create_embedding_service(config: Union[EmbeddingModelConfig, Dict[str, Any]]) -> BaseEmbeddingService:
        """Create an embedding service from a config"""
        if isinstance(config, dict):
            config = EmbeddingModelConfig(**config)
            
        if not isinstance(config, EmbeddingModelConfig):
            raise ValueError("config must be an EmbeddingModelConfig or dict")
        
        provider_map = {
            EmbeddingProvider.OPENAI: OpenAIEmbeddingService,
            EmbeddingProvider.HUGGINGFACE: HuggingFaceEmbeddingService,
            EmbeddingProvider.SENTENCE_TRANSFORMERS: SentenceTransformersService,
        }
        
        if config.provider not in provider_map:
            raise ValueError(f"Unsupported embedding provider: {config.provider}")
        
        return provider_map[config.provider](config)
    
    @staticmethod
    def create_default_embedding_service() -> BaseEmbeddingService:
        """Create a default embedding service based on environment"""
        # Check for OpenAI API key
        if os.environ.get("OPENAI_API_KEY"):
            return EmbeddingServiceFactory.create_embedding_service({
                "provider": EmbeddingProvider.OPENAI,
                "model_name": "text-embedding-3-small",
                "dimensions": 1536,
                "api_key_env": "OPENAI_API_KEY"
            })
        
        # Fall back to Sentence Transformers
        return EmbeddingServiceFactory.create_embedding_service({
            "provider": EmbeddingProvider.SENTENCE_TRANSFORMERS,
            "model_name": "all-MiniLM-L6-v2",
            "dimensions": 384
        })

# Example usage
if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    
    # Example with OpenAI
    if os.environ.get("OPENAI_API_KEY"):
        config = EmbeddingModelConfig(
            provider=EmbeddingProvider.OPENAI,
            model_name="text-embedding-3-small",
            dimensions=1536,
            api_key_env="OPENAI_API_KEY"
        )
        service = EmbeddingServiceFactory.create_embedding_service(config)
        result = service.get_embedding("This is a test sentence.")
        print(f"OpenAI embedding (first 10 dims): {result[:10]}...")
    
    # Example with Sentence Transformers
    config = EmbeddingModelConfig(
        provider=EmbeddingProvider.SENTENCE_TRANSFORMERS,
        model_name="all-MiniLM-L6-v2",
        dimensions=384
    )
    service = EmbeddingServiceFactory.create_embedding_service(config)
    result = service.get_embeddings(["This is a test sentence.", "This is another sentence."])
    print(f"Sentence Transformers embeddings shape: {len(result.embeddings)}x{len(result.embeddings[0])}")
    
    # Using the default factory
    default_service = EmbeddingServiceFactory.create_default_embedding_service()
    print(f"Default service: {default_service.get_model_name()} ({default_service.get_dimensions()}d)")
