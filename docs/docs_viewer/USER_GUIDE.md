# docs_viewer User Guide

## Overview

docs_viewer is a powerful, user-friendly documentation viewer for Markdown, PDF, DOCX, and plain text files. It features a beautiful three-column layout, tagging, starring, commenting, editing, search/filter, and local AI model integration (Ollama, LM Studio, vLLM). It is cross-platform and works on desktop and mobile (PWA-ready).

## Features
- Three-column layout: folder tree, content viewer, metadata/annotation panel
- Supports Markdown, PDF, DOCX, TXT
- Tagging, starring, commenting, editing
- Filtering and search
- Folder picker (choose any folder as root)
- Light/dark mode
- LLM model management (Ollama, LM Studio, vLLM)
- AI-powered summarization, improvement, crosslinking, Q&A (if enabled)
- Export/import metadata
- Responsive and accessible UI

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Running the App
1. **Install dependencies**
   ```sh
   cd docs_viewer/frontend
   npm install
   cd ../backend
   npm install
   ```
2. **Start the backend**
   ```sh
   cd docs_viewer/backend
   node index.js
   ```
3. **Start the frontend**
   ```sh
   cd docs_viewer/frontend
   npm run dev
   ```
4. **Open the app**
   - Visit `http://localhost:5173` in your browser

## Using docs_viewer

### Browsing and Viewing Files
- The left column shows a tree of all files and folders.
- Click a file to view it in the center panel.
- Supported formats: Markdown, PDF, DOCX, TXT (PDF/DOCX support may require additional setup).

### Tagging, Starring, and Commenting
- The right column shows metadata for the selected file.
- Add/remove tags, star/unstar, and add comments.
- All changes are saved automatically.

### Editing Files
- Markdown and TXT files can be edited in-app (edit button in viewer or metadata panel).
- All edits are versioned (backups are kept).

### Folder Picker
- Click "Select Folder" in the top bar to choose a new root folder (uses browser folder picker if available).
- The file tree will rebuild for the selected folder.

### Light/Dark Mode
- Toggle light/dark mode using the sun/moon icon in the top bar.

### LLM Model Management and AI Features
- Click the settings icon to open the LLM Model Manager.
- Select backend (Ollama, LM Studio, vLLM), list/load/unload models, and select the active model.
- Use AI features (summarize, improve, crosslink, Q&A) from the file viewer or metadata panel (if enabled).

### Export/Import Metadata
- Export all tags, stars, and comments as JSON from the settings panel.
- Import metadata from JSON to restore or migrate.

## Troubleshooting & FAQ
- **Folder picker not working?** Some browsers do not support the File System Access API. Use a supported browser or set the root folder manually in the backend.
- **PDF/DOCX not rendering?** Ensure required libraries are installed and supported in your browser.
- **AI features not working?** Make sure your LLM backend (Ollama, LM Studio, vLLM) is running and accessible.
- **App not starting?** Check Node.js and npm versions, and ensure all dependencies are installed.

## Contact & Support
- For help, open an issue in the repository or contact the project maintainer. 