# docs_viewer

## One-Click Start
Just double-click `start_docs_viewer.bat`—no other setup required. The batch file will install all dependencies and start both backend and frontend automatically. See [start_docs_viewer.bat](./start_docs_viewer.bat) for details.

**Single Executable:**
If you build the backend as a `.exe` (see below), and the frontend is built (`npm run build` in `frontend`), just double-click the `.exe`—it will serve the app at [http://localhost:5174](http://localhost:5174) in any browser, even in Windows Sandbox.

A beautiful, powerful documentation viewer for Markdown, PDF, DOCX, and plain text files. Features a three-column layout (tree, content, metadata), tagging, starring, commenting, filtering, search, and more. Designed for extensibility, cross-platform use, and future RAG/AI integration.

## Features
- Three-column layout: folder tree, content viewer, metadata/annotation panel
- Supports Markdown, PDF, DOCX, TXT (easily extensible)
- Tagging, starring, commenting, filtering, and search
- Select any folder as the root (Windows folder picker dialog)
- Light/dark mode toggle
- Responsive design (desktop/mobile)
- Extensive logging and robust error handling
- No authentication required
- Easy to import into other projects
- Designed for future RAG/AI integration (e.g., ChromaDB)

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Setup

1. **Install dependencies**
   ```sh
   cd docs_viewer/frontend
   npm install
   cd ../backend
   npm install
   ```

2. **Run the backend**
   - From the repo root:
     ```powershell
     cd docs_viewer/backend
     npm run dev
     ```
   - Or, from the frontend directory:
     ```powershell
     cd ..\backend
     npm run dev
     ```
   - (For Command Prompt, use `cd ..\backend` as well.)

3. **Run the frontend**
   ```sh
   cd docs_viewer/frontend
   npm run dev
   ```

4. **Open the app**
   - Visit `http://localhost:5173` (or as shown in the terminal)

## Usage
- Browse and view docs in any folder
- Tag, star, comment, filter, and search files
- Switch between light/dark mode
- Select a new folder at any time

## Extensibility
- Add new file types easily (see `src/components/viewers`)
- Backend is modular and can be swapped for cloud/local
- Designed for future RAG/AI integration

## Testing
- Backend: Jest or Mocha/Chai
- Frontend: React Testing Library, Jest, Cypress
- Run tests with `npm test` in each subfolder

## License
MIT 

## Troubleshooting

- **Node.js or npm not installed:** Download and install from [nodejs.org](https://nodejs.org/).
- **Port already in use:** Make sure no other app is using ports 5173 or 5174.
- **Dependency install failures:** See `logs/backend_install.log` and `logs/frontend_install.log` for details. Try deleting `node_modules` and running the batch file again.
- **Still stuck?** Open an issue or check the logs in the `logs/` folder.

## Building a Single Executable (.exe) for Windows

You can bundle the backend as a Windows `.exe` using [pkg](https://github.com/vercel/pkg):

1. Install pkg globally:
   ```sh
   npm install -g pkg
   ```
2. Build the backend executable:
   ```sh
   cd docs_viewer/backend
   npm install
   pkg . --targets node18-win-x64 --output docs_viewer_backend.exe
   ```
3. Build the frontend static files:
   ```sh
   cd ../frontend
   npm install
   npm run build
   ```
4. Place the `docs_viewer_backend.exe` and the `dist` folder (from frontend) together, or keep the original structure. The backend will serve the frontend automatically.
5. Double-click the `.exe`—the app will be available at [http://localhost:5174](http://localhost:5174).

See [Single Executable Guide](./SINGLE_EXECUTABLE.md) for full instructions.

## Testing in Windows Sandbox

1. Copy the built `.exe` and `frontend/dist` folder into the Sandbox.
2. Double-click the `.exe` to start the backend.
3. Open the frontend in a browser (or use Electron for a desktop app). 