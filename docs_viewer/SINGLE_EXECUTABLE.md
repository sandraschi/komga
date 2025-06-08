# Single Executable Guide for Docs Viewer (Windows)

This guide explains how to bundle the docs_viewer backend as a single Windows `.exe` and serve the frontend for a true one-click experience. No Node.js or npm required for end users!

## 1. Prerequisites
- Node.js and npm (for building, not for end users)
- [pkg](https://github.com/vercel/pkg) (`npm install -g pkg`)
- (Optional) [Electron](https://www.electronjs.org/) for a desktop app

## 2. Build the Backend Executable

1. Open a terminal in the backend directory:
   ```sh
   cd docs_viewer/backend
   ```
2. Install all dependencies:
   ```sh
   npm install
   ```
3. Build the executable:
   ```sh
   pkg . --targets node18-win-x64 --output docs_viewer_backend.exe
   ```
   This creates `docs_viewer_backend.exe` in the backend folder.

## 3. Build the Frontend Static Files

1. Open a terminal in the frontend directory:
   ```sh
   cd docs_viewer/frontend
   npm install
   npm run build
   ```
2. The static files will be in `docs_viewer/frontend/dist`.

## 4. Serve the Frontend with the Backend

- You can configure the backend to serve static files from `../frontend/dist`.
- Or, use a simple static file server (e.g., [serve](https://www.npmjs.com/package/serve)) or package with Electron.

## 5. Distribute to End Users

- Provide `docs_viewer_backend.exe` and the `dist` folder.
- End users just double-click the `.exe`—no Node.js, npm, or terminal required.

## 6. Testing in Windows Sandbox

1. Copy `docs_viewer_backend.exe` and the `dist` folder into the Sandbox.
2. Double-click the `.exe` to start the backend.
3. Open a browser in the Sandbox and go to `http://localhost:5174` (or the port you configured).
4. The frontend should load and connect to the backend.

## 7. Optional: Electron Packaging

- For a true desktop app, use Electron to bundle both backend and frontend into a single `.exe`.
- See [Electron documentation](https://www.electronjs.org/docs/latest/tutorial/quick-start) for details.

## 8. Troubleshooting

- **Executable fails to run:** Make sure all dependencies are bundled or available.
- **Port in use:** Change the backend port in your config or free the port.
- **Static files not found:** Ensure the backend is configured to serve the correct `dist` folder.
- **Antivirus warnings:** Code-sign your `.exe` for production distribution.

## 9. Links
- [Back to README](./README.md)
- [start_docs_viewer.bat](./start_docs_viewer.bat)

---

For questions or issues, open an issue in the repository or check the logs. 