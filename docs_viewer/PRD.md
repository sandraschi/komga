# Product Requirements Document (PRD): docs_viewer

## Overview

docs_viewer is a powerful, user-friendly documentation viewer designed for technical and non-technical users. It provides a beautiful, three-column interface for browsing, searching, and annotating documentation in Markdown, PDF, DOCX, and plain text formats. The tool is self-contained, easily importable into other repositories, and designed for extensibility (including future RAG/AI features). It is cross-platform and will be usable on desktop and mobile (including iOS/PWA).

## Goals
- Fast, intuitive, and visually appealing documentation viewer
- Three-column layout: folder tree, content viewer, metadata/annotation panel
- Support for Markdown, PDF, DOCX, TXT (and easily extensible)
- Tagging, starring, commenting, filtering, and search
- Folder selection dialog (Windows, cross-platform)
- Light/dark mode toggle
- Extensive logging and robust error handling
- No authentication required
- Designed for future RAG/AI integration (e.g., ChromaDB)
- Easy to import into other projects

## Features

### UI/UX
- **Three-column layout**
  - **Left**: Tree view of all files/folders (recursive, dynamic, supports folder selection dialog)
  - **Center**: Renders Markdown, PDF, DOCX, TXT beautifully
  - **Right**: Displays file metadata (name, size, type, tags, stars, comments, etc.)
- **Tagging, starring, commenting** on files
- **Filtering and searching** (by name, tag, content)
- **Light/dark mode** toggle
- **Select any folder** as the root (Windows folder picker dialog)
- **Responsive design** for desktop and mobile

### Backend
- **Express.js server**
- **SQLite** for metadata, tags, stars, comments
- **REST API** for:
  - File tree
  - File content (streaming for large files)
  - Metadata CRUD
  - Tag/star/comment CRUD
  - Search/filter
- **Extensive logging** (Winston)
- **Error catching** with user-friendly messages

### Frontend
- **React + MUI** for fast, beautiful UI
- **react-markdown**, **pdfjs-dist**, **mammoth** for rendering
- **react-dropzone** for folder selection
- **react-toastify** for notifications
- **axios** for API calls
- **Extensive error boundaries and logging**

### Testing
- **Backend**: Jest or Mocha/Chai for API and logic
- **Frontend**: React Testing Library, Jest, Cypress for E2E
- **Test coverage reports**
- **Manual test scripts** for user flows

### Extensibility
- Easy to add new file types
- Backend can be swapped for cloud or local
- UI is responsive, mobile-friendly, and can be wrapped as PWA or Electron app
- Designed for future RAG/AI integration (e.g., ChromaDB)

## Out of Scope
- Authentication/user management
- Cloud sync (initial version)
- Advanced permissions

## Success Criteria
- Can browse and view docs in any folder
- All supported formats render correctly
- Tagging, starring, commenting, search/filter work
- Folder selection and tree rebuild work
- Light/dark mode toggle works
- No crashes, clear error messages, logs available
- >90% test coverage on core logic

## Future Enhancements
- RAG/AI-powered search and summarization
- ChromaDB integration
- Cloud sync and sharing
- User authentication and permissions 