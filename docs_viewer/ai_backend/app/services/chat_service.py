import logging
from typing import List, Dict, Any, Optional, AsyncGenerator, Union
from datetime import datetime
import json
import uuid
from enum import Enum

from pydantic import BaseModel, Field, validator
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain.memory import ChatMessageHistory
from langchain_community.chat_message_histories import RedisChatMessageHistory

from app.core.config import settings
from app.services.embedding_service import EmbeddingServiceFactory
from app.models.document import Document, DocumentChunk, Collection
from app.services.document_processor import DocumentProcessor

logger = logging.getLogger(__name__)

class MessageRole(str, Enum):
    """Roles for chat messages"""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"

class ChatMessage(BaseModel):
    """A single message in a conversation"""
    role: MessageRole = Field(..., description="The role of the message sender")
    content: str = Field(..., description="The message content")
    name: Optional[str] = Field(None, description="The name of the message sender")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="When the message was created")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "role": self.role.value,
            "content": self.content,
            "name": self.name,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ChatMessage':
        """Create from dictionary"""
        return cls(
            role=MessageRole(data["role"]),
            content=data["content"],
            name=data.get("name"),
            timestamp=datetime.fromisoformat(data["timestamp"]) if isinstance(data.get("timestamp"), str) else data.get("timestamp"),
            metadata=data.get("metadata", {})
        )
    
    def to_langchain(self):
        """Convert to LangChain message format"""
        if self.role == MessageRole.SYSTEM:
            return SystemMessage(content=self.content, additional_kwargs={"name": self.name} if self.name else {})
        elif self.role == MessageRole.USER:
            return HumanMessage(content=self.content, name=self.name)
        elif self.role == MessageRole.ASSISTANT:
            return AIMessage(content=self.content, name=self.name)
        else:
            # For tool messages or other types
            return AIMessage(content=self.content, additional_kwargs={"role": self.role, "name": self.name})
    
    @classmethod
    def from_langchain(cls, message) -> 'ChatMessage':
        """Create from LangChain message format"""
        if isinstance(message, SystemMessage):
            return cls(
                role=MessageRole.SYSTEM,
                content=message.content,
                name=getattr(message, "name", None)
            )
        elif isinstance(message, HumanMessage):
            return cls(
                role=MessageRole.USER,
                content=message.content,
                name=getattr(message, "name", None)
            )
        elif isinstance(message, AIMessage):
            return cls(
                role=MessageRole(message.additional_kwargs.get("role", "assistant")),
                content=message.content,
                name=getattr(message, "name", None)
            )
        else:
            return cls(
                role=MessageRole.ASSISTANT,
                content=str(message.content) if hasattr(message, "content") else str(message),
                name=getattr(message, "name", None)
            )

class ChatSessionConfig(BaseModel):
    """Configuration for a chat session"""
    model: str = Field("gpt-3.5-turbo", description="The model to use for this session")
    temperature: float = Field(0.7, ge=0, le=2, description="Sampling temperature")
    max_tokens: Optional[int] = Field(1000, ge=1, le=4000, description="Maximum tokens to generate")
    top_p: float = Field(1.0, ge=0, le=1, description="Nucleus sampling parameter")
    frequency_penalty: float = Field(0.0, ge=-2, le=2, description="Frequency penalty")
    presence_penalty: float = Field(0.0, ge=-2, le=2, description="Presence penalty")
    stop: Optional[List[str]] = Field(None, description="Stop sequences")
    system_message: str = Field(
        "You are a helpful AI assistant.",
        description="System message to guide the model's behavior"
    )
    use_rag: bool = Field(True, description="Whether to use RAG for context")
    rag_collections: List[str] = Field(
        default_factory=list,
        description="Collection IDs to use for RAG context"
    )
    rag_documents: List[str] = Field(
        default_factory=list,
        description="Document IDs to use for RAG context"
    )
    rag_k: int = Field(5, description="Number of chunks to retrieve for RAG")
    rag_score_threshold: float = Field(0.7, description="Minimum similarity score for RAG chunks")

class ChatSession:
    """Manages a single chat session"""
    
    def __init__(
        self,
        session_id: str,
        config: Optional[Union[ChatSessionConfig, Dict[str, Any]]] = None,
        db_session = None,
        embedding_service = None,
        document_processor = None
    ):
        """Initialize a chat session"""
        self.session_id = session_id
        self.config = config if isinstance(config, ChatSessionConfig) else ChatSessionConfig(**(config or {}))
        self.db_session = db_session
        self.llm = self._init_llm()
        self.embedding_service = embedding_service or EmbeddingServiceFactory.create_default_embedding_service()
        self.document_processor = document_processor or DocumentProcessor(
            upload_dir=settings.UPLOAD_DIR,
            chroma_db_path=settings.CHROMA_DB_PATH
        )
        
        # Initialize message history
        if settings.REDIS_URL:
            self.history = RedisChatMessageHistory(
                session_id=session_id,
                url=settings.REDIS_URL,
                key_prefix="chat:"
            )
        else:
            # In-memory history (not recommended for production)
            self.history = ChatMessageHistory()
        
        # Initialize the chat chain
        self.chain = self._create_chain()
    
    def _init_llm(self):
        """Initialize the language model"""
        try:
            # Try to use OpenAI if API key is available
            if settings.OPENAI_API_KEY:
                from langchain_openai import ChatOpenAI
                return ChatOpenAI(
                    model_name=self.config.model,
                    temperature=self.config.temperature,
                    max_tokens=self.config.max_tokens,
                    openai_api_key=settings.OPENAI_API_KEY
                )
            
            # Fall back to local models
            from langchain_community.llms import Ollama
            return Ollama(
                model=self.config.model if self.config.model != "gpt-3.5-turbo" else "llama2",
                temperature=self.config.temperature,
                num_predict=self.config.max_tokens or 1000
            )
            
        except ImportError as e:
            logger.error(f"Error initializing LLM: {e}")
            raise ImportError("Please install required packages: pip install openai langchain-community")
    
    def _create_chain(self):
        """Create the LangChain chain for this session"""
        # Create the prompt template
        prompt = ChatPromptTemplate.from_messages([
            ("system", self.config.system_message),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}")
        ])
        
        # Create the chain
        chain = prompt | self.llm | StrOutputParser()
        
        # Add message history
        chain_with_history = RunnableWithMessageHistory(
            chain,
            lambda session_id: self.history,
            input_messages_key="input",
            history_messages_key="history",
        )
        
        return chain_with_history
    
    async def add_message(self, message: Union[ChatMessage, Dict[str, Any], str], role: MessageRole = None) -> ChatMessage:
        """Add a message to the chat history"""
        if isinstance(message, str):
            if not role:
                role = MessageRole.USER
            message = ChatMessage(role=role, content=message)
        elif isinstance(message, dict):
            message = ChatMessage(**message)
        
        # Add to history
        self.history.add_message(message.to_langchain())
        return message
    
    async def get_messages(self, limit: int = 100, offset: int = 0) -> List[ChatMessage]:
        """Get chat history"""
        messages = self.history.messages[offset:offset+limit] if self.history.messages else []
        return [ChatMessage.from_langchain(m) for m in messages]
    
    async def clear_history(self):
        """Clear chat history"""
        self.history.clear()
    
    async def generate_response(
        self,
        user_input: str,
        stream: bool = False
    ) -> Union[str, AsyncGenerator[str, None]]:
        """Generate a response to user input"""
        try:
            # Add user message to history
            await self.add_message(user_input, MessageRole.USER)
            
            # Get RAG context if enabled
            context = ""
            if self.config.use_rag and (self.config.rag_collections or self.config.rag_documents):
                context = await self._get_rag_context(user_input)
            
            # Prepare input
            chain_input = {
                "input": f"{context}\n\nUser: {user_input}" if context else user_input,
                "config": {"configurable": {"session_id": self.session_id}}
            }
            
            if stream:
                return self._stream_response(chain_input)
            else:
                # Generate response
                response = await self.chain.ainvoke(chain_input)
                
                # Add assistant message to history
                await self.add_message(response, MessageRole.ASSISTANT)
                
                return response
                
        except Exception as e:
            logger.error(f"Error generating response: {e}", exc_info=True)
            error_msg = f"Sorry, I encountered an error: {str(e)}"
            await self.add_message(error_msg, MessageRole.ASSISTANT)
            return error_msg
    
    async def _get_rag_context(self, query: str) -> str:
        """Get relevant context from RAG"""
        if not self.db_session:
            return ""
        
        try:
            # Get relevant document chunks
            search_results = []
            
            # Search in specified documents
            if self.config.rag_documents:
                for doc_id in self.config.rag_documents:
                    try:
                        results = self.document_processor.search_documents(
                            query=query,
                            collection_name=f"doc_{doc_id}",
                            k=self.config.rag_k
                        )
                        search_results.extend(results)
                    except Exception as e:
                        logger.warning(f"Error searching document {doc_id}: {e}")
            
            # Search in collections
            if self.config.rag_collections:
                for coll_id in self.config.rag_collections:
                    try:
                        # Get all documents in the collection
                        collection = self.db_session.get(Collection, coll_id)
                        if not collection:
                            continue
                            
                        for doc in collection.documents:
                            results = self.document_processor.search_documents(
                                query=query,
                                collection_name=f"doc_{doc.id}",
                                k=self.config.rag_k
                            )
                            search_results.extend(results)
                    except Exception as e:
                        logger.warning(f"Error searching collection {coll_id}: {e}")
            
            # Filter by score threshold and sort
            filtered_results = [
                r for r in search_results
                if r.get('score', 0) >= self.config.rag_score_threshold
            ]
            filtered_results.sort(key=lambda x: x.get('score', 0), reverse=True)
            
            # Format context
            context_parts = []
            seen_chunks = set()
            
            for i, result in enumerate(filtered_results[:self.config.rag_k]):
                chunk_id = result.get('metadata', {}).get('chunk_id')
                if chunk_id in seen_chunks:
                    continue
                    
                seen_chunks.add(chunk_id)
                doc_id = result.get('metadata', {}).get('document_id')
                doc = self.db_session.get(Document, doc_id) if doc_id else None
                
                context_parts.append(
                    f"Document: {doc.title if doc else 'Unknown'}\n"
                    f"Content: {result.get('content', '')}\n"
                    f"Relevance: {result.get('score', 0):.2f}\n"
                )
            
            if not context_parts:
                return ""
                
            return "\n\n".join(["Relevant information:"] + context_parts)
            
        except Exception as e:
            logger.error(f"Error in RAG context retrieval: {e}", exc_info=True)
            return f"[Error retrieving context: {str(e)}]"
    
    async def _stream_response(self, chain_input: Dict[str, Any]) -> AsyncGenerator[str, None]:
        """Stream the response from the LLM"""
        from langchain_core.runnables.utils import AddableDict
        
        # Initialize response buffer
        full_response = []
        
        try:
            # Stream the response
            async for chunk in self.chain.astream(chain_input):
                if isinstance(chunk, str):
                    yield chunk
                    full_response.append(chunk)
                elif isinstance(chunk, dict) and 'output' in chunk:
                    yield chunk['output']
                    full_response.append(chunk['output'])
                elif hasattr(chunk, 'content'):
                    yield chunk.content
                    full_response.append(chunk.content)
        except Exception as e:
            logger.error(f"Error in response streaming: {e}", exc_info=True)
            yield f"\n\n[Error: {str(e)}]"
        finally:
            # Add the complete response to history
            if full_response:
                full_text = "".join(full_response)
                await self.add_message(full_text, MessageRole.ASSISTANT)

class ChatManager:
    """Manages multiple chat sessions"""
    
    def __init__(self, db_session=None):
        """Initialize the chat manager"""
        self.sessions = {}
        self.db_session = db_session
        self.embedding_service = EmbeddingServiceFactory.create_default_embedding_service()
        self.document_processor = DocumentProcessor(
            upload_dir=settings.UPLOAD_DIR,
            chroma_db_path=settings.CHROMA_DB_PATH
        )
    
    def get_session(
        self,
        session_id: Optional[str] = None,
        config: Optional[Union[ChatSessionConfig, Dict[str, Any]]] = None
    ) -> ChatSession:
        """Get or create a chat session"""
        session_id = session_id or str(uuid.uuid4())
        
        if session_id not in self.sessions:
            self.sessions[session_id] = ChatSession(
                session_id=session_id,
                config=config,
                db_session=self.db_session,
                embedding_service=self.embedding_service,
                document_processor=self.document_processor
            )
        
        return self.sessions[session_id]
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a chat session"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False
    
    def list_sessions(self) -> List[str]:
        """List all active session IDs"""
        return list(self.sessions.keys())

# Example usage
if __name__ == "__main__":
    import asyncio
    
    async def test_chat():
        # Create a chat manager
        chat_manager = ChatManager()
        
        # Get or create a session
        session = chat_manager.get_session("test-session")
        
        # Have a conversation
        response = await session.generate_response("Hello, how are you?")
        print(f"Assistant: {response}")
        
        response = await session.generate_response("What can you do?")
        print(f"Assistant: {response}")
        
        # Get chat history
        messages = await session.get_messages()
        print("\nChat History:")
        for msg in messages:
            print(f"{msg.role.value}: {msg.content[:50]}...")
    
    asyncio.run(test_chat())
