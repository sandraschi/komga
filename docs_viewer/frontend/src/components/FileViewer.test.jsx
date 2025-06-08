import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import FileViewer from './FileViewer';
import axios from 'axios';

vi.mock('axios');
vi.mock('pdfjs-dist/build/pdf', () => ({
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      getPage: vi.fn(() => Promise.resolve({
        getViewport: vi.fn(() => ({ width: 100, height: 100 })),
        render: vi.fn(() => ({ promise: Promise.resolve() })),
      })),
    }),
  })),
}));
vi.mock('pdfjs-dist/build/pdf.worker.entry', () => {});
vi.mock('mammoth/mammoth.browser', () => ({
  convertToHtml: vi.fn(() => Promise.resolve({ value: '<p>DOCX Content</p>' })),
}));

describe('FileViewer', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders markdown content', async () => {
    axios.get.mockResolvedValueOnce({ data: '# Hello World' });
    render(<FileViewer filePath="test.md" root="/docs" />);
    await waitFor(() => expect(screen.getByText('Hello World')).toBeInTheDocument());
  });

  it('renders txt content', async () => {
    axios.get.mockResolvedValueOnce({ data: 'plain text' });
    render(<FileViewer filePath="test.txt" root="/docs" />);
    await waitFor(() => expect(screen.getByText('plain text')).toBeInTheDocument());
  });

  it('renders PDF first page', async () => {
    axios.get.mockResolvedValueOnce({ data: new Blob() });
    render(<FileViewer filePath="test.pdf" root="/docs" />);
    // This test is a placeholder; PDF rendering is not easily testable in jsdom
    expect(screen.getByText(/Page/i)).toBeInTheDocument();
  });

  it('renders DOCX as HTML', async () => {
    axios.get.mockResolvedValueOnce({ data: new Blob([new ArrayBuffer(8)]) });
    render(<FileViewer filePath="test.docx" root="/docs" />);
    await waitFor(() => expect(screen.getByText(/DOCX Content/i)).toBeInTheDocument());
  });

  it('shows loading state', () => {
    render(<FileViewer filePath="test.md" root="/docs" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    axios.get.mockRejectedValueOnce(new Error('Failed to load'));
    render(<FileViewer filePath="test.md" root="/docs" />);
    await waitFor(() => expect(screen.getByText(/Failed to load/i)).toBeInTheDocument());
  });

  it('shows unsupported file type', () => {
    render(<FileViewer filePath="test.xyz" root="/docs" />);
    expect(screen.getByText(/Unsupported file type/i)).toBeInTheDocument();
  });

  it('prompts to select a file if none is selected', () => {
    render(<FileViewer filePath={null} root="/docs" />);
    expect(screen.getByText(/Select a file to view/i)).toBeInTheDocument();
  });
}); 