from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel

# Import routers
from app.api import documents, chat, search, playground

app = FastAPI(
    title="AI-Powered Document Tool",
    description="Advanced document processing and analysis with AI",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(playground.router, prefix="/api/playground", tags=["playground"])

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Serve frontend build files in production
if os.environ.get("PRODUCTION"):
    frontend_build = Path(__file__).parent.parent / "frontend" / "dist"
    if frontend_build.exists():
        app.mount("/", StaticFiles(directory=str(frontend_build), html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
