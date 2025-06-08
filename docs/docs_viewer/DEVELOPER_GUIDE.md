# docs_viewer Developer Guide

## Project Structure

- `docs_viewer/frontend/` — React + MUI frontend (Vite)
  - `src/components/` — UI components (FileTree, FileViewer, MetadataPanel, LLMModelManager, etc.)
  - `src/App.jsx` — Main app layout and state
- `docs_viewer/backend/` — Express + SQLite backend
  - `index.js` — Main server, REST API, LLM connectors
  - `test.js` — Backend tests
- `docs/docs_viewer/` — Documentation (user guide, requirements, etc.)

## Running and Developing Locally

1. **Install dependencies**
   ```sh
   cd docs_viewer/frontend && npm install
   cd ../backend && npm install
   ```
2. **Start backend**
   ```sh
   cd docs_viewer/backend
   node index.js
   ```
3. **Start frontend**
   ```sh
   cd docs_viewer/frontend
   npm run dev
   ```
4. **Open app**
   - Visit `http://localhost:5173`

## Adding New File Types/Renderers
- Add logic to `FileViewer.jsx` to detect and render new file types.
- For PDF: integrate `pdfjs-dist`.
- For DOCX: integrate `mammoth`.
- For images: use `<img>` or a viewer component.
- Update backend `/api/file` to serve correct content type if needed.

## Extending LLM Integration
- Add new backend config to `LLM_CONFIG` in `backend/index.js`.
- Add model listing, loading, and inference logic for the new backend.
- Update `LLMModelManager.jsx` to include the new backend in the UI.

## Adding New Features
- **Bulk operations:** Add endpoints in backend and UI in MetadataPanel or a new component.
- **Export/import:** Use `/api/meta/export` and `/api/meta/import` endpoints; add UI in settings.
- **Advanced search/filter:** Add backend logic and UI controls.
- **Accessibility:** Use MUI's accessibility features and test with screen readers.

## Testing
- **Backend:** Use Jest or Mocha/Chai. See `test.js` for examples.
- **Frontend:** Use React Testing Library and Jest. See `setupTests.js`.
- **E2E:** Add Cypress or Playwright tests for user flows.

## Logging and Error Handling
- Backend uses Winston for logging (console by default).
- All API errors are logged and return user-friendly messages.
- Frontend uses Snackbar/Alert for user notifications.

## Contribution Guidelines
- Follow code style and naming conventions.
- Write tests for new features.
- Update documentation as needed.
- Open a pull request with a clear description of changes.

## Contact & Support
- For help, open an issue in the repository or contact the project maintainer. 