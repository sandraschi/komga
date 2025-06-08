# Docs Viewer

## Features

- Three-column layout: file tree, file viewer, metadata panel
- Supports Markdown (`.md`), plain text (`.txt`), PDF (`.pdf`), and DOCX (`.docx`) files
- PDF: renders first page as canvas (using `pdfjs-dist`)
- DOCX: renders as HTML (using `mammoth`)
- Loading and error states for all file types
- File metadata: tags, stars, comments, etc.
- Tagging, starring, commenting, filtering, search, editing
- Folder picker for root selection
- Light/dark mode
- User-friendly, extensible, importable
- No authentication required
- Extensive logging, error handling, and testing

## Dependencies

- `pdfjs-dist` for PDF rendering
- `mammoth` for DOCX rendering
- `@mui/material`, `axios`, `react-markdown`, etc.

## Testing

- FileViewer is tested for all supported file types, loading, error, and unsupported file states
- Mocks are used for axios, pdfjs-dist, and mammoth

## Usage

See the user guide for details on using the Docs Viewer, including how to view PDFs and DOCX files. 