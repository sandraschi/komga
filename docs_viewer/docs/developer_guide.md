# Docs Viewer Developer Guide

## FileViewer Component

- Handles rendering of Markdown, TXT, PDF, and DOCX files.
- Uses `pdfjs-dist` to render the first page of PDFs as a canvas.
- Uses `mammoth` to convert DOCX files to HTML for display.
- Shows loading and error states for all file types.
- Extensible for future file formats.

### Dependencies

- `pdfjs-dist` (PDF rendering)
- `mammoth` (DOCX to HTML)
- `axios` (file fetching)
- `react-markdown` (Markdown rendering)

### Code Structure

- File type is determined by extension.
- For PDF/DOCX, files are fetched as blobs and processed in `useEffect` hooks.
- PDF: uses a canvas ref and pdfjs-dist to render the first page.
- DOCX: uses mammoth to convert to HTML, then renders with `dangerouslySetInnerHTML`.
- Loading and error states are managed with React state.

### Testing

- `FileViewer.test.jsx` covers:
  - Rendering for all supported file types
  - Loading and error states
  - Unsupported file types
  - Uses mocks for axios, pdfjs-dist, and mammoth

## Extending File Support

- Add new file type checks in FileViewer.
- Add new dependencies as needed.
- Add tests for new file types.

See the code and tests in `frontend/src/components/` for details. 