import React, { useEffect, useState, useRef } from 'react';
import { Box, CircularProgress, Typography, Button, Stack, List, ListItem, ListItemText } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import 'pdfjs-dist/build/pdf.worker.entry';
import mammoth from 'mammoth/mammoth.browser';
import { useLanguage } from '../context/LanguageContext';
// TODO: Import PDF and DOCX renderers

const PAGE_SIZE_CHARS = 5000;
const PAGE_SIZE_LINES = 100;

const FileViewer = ({ filePath, root, fileType }) => {
  const { t } = useLanguage();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [docxBlob, setDocxBlob] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfOutline, setPdfOutline] = useState([]);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfNumPages, setPdfNumPages] = useState(1);
  const pdfCanvasRef = useRef(null);
  const [docxPages, setDocxPages] = useState([]);
  const [docxPage, setDocxPage] = useState(1);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);

  useEffect(() => {
    if (!filePath) return;
    setLoading(true);
    setError(null);
    setContent('');
    setPdfBlob(null);
    setDocxBlob(null);
    setPdfDoc(null);
    setPdfOutline([]);
    setPdfPage(1);
    setPdfNumPages(1);
    setDocxPages([]);
    setDocxPage(1);
    setPage(1);
    setNumPages(1);
    const ext = fileType || (filePath ? filePath.split('.').pop().toLowerCase() : '');
    if (ext === 'pdf') {
      axios
        .get('/api/file', { params: { path: filePath, root }, responseType: 'blob' })
        .then((res) => setPdfBlob(res.data))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else if (ext === 'docx') {
      axios
        .get('/api/file', { params: { path: filePath, root }, responseType: 'blob' })
        .then((res) => setDocxBlob(res.data))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else {
      axios
        .get('/api/file', { params: { path: filePath, root } })
        .then((res) => {
          setContent(res.data);
          // Paging for markdown/txt
          const lines = res.data.split('\n');
          if (lines.length > PAGE_SIZE_LINES) {
            setNumPages(Math.ceil(lines.length / PAGE_SIZE_LINES));
          } else if (res.data.length > PAGE_SIZE_CHARS) {
            setNumPages(Math.ceil(res.data.length / PAGE_SIZE_CHARS));
          } else {
            setNumPages(1);
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [filePath, root, fileType]);

  // Load PDF document and outline
  useEffect(() => {
    if (!pdfBlob) return;
    setLoading(true);
    const loadPdf = async () => {
      try {
        const url = URL.createObjectURL(pdfBlob);
        const doc = await pdfjsLib.getDocument(url).promise;
        setPdfDoc(doc);
        setPdfNumPages(doc.numPages);
        setPdfPage(1);
        // Get outline (TOC)
        const outline = await doc.getOutline();
        setPdfOutline(outline || []);
        URL.revokeObjectURL(url);
        setLoading(false);
      } catch (e) {
        setError('Failed to load PDF.');
        setLoading(false);
      }
    };
    loadPdf();
  }, [pdfBlob]);

  // Render selected PDF page
  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current) return;
    setLoading(true);
    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pdfPage);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = pdfCanvasRef.current;
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        setLoading(false);
      } catch (e) {
        setError('Failed to render PDF page.');
        setLoading(false);
      }
    };
    renderPage();
  }, [pdfDoc, pdfPage]);

  // Render DOCX as HTML (with paging)
  useEffect(() => {
    if (!docxBlob) return;
    setLoading(true);
    const renderDocx = async () => {
      try {
        const arrayBuffer = await docxBlob.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setContent(result.value);
        // Split into pages by <h1>, <hr>, or every 20 paragraphs as fallback
        let html = result.value;
        let pages = [];
        if (/<hr\s*\/?\s*>/i.test(html)) {
          pages = html.split(/<hr\s*\/?\s*>/i);
        } else if (/<h1/i.test(html)) {
          pages = html.split(/<h1[^>]*>/i).filter(Boolean).map((s, i) => (i === 0 ? s : '<h1>' + s));
        } else {
          // Fallback: every 20 <p>
          const para = html.split(/<p[^>]*>/i);
          for (let i = 0; i < para.length; i += 20) {
            pages.push(para.slice(i, i + 20).join('<p>'));
          }
        }
        setDocxPages(pages.length > 0 ? pages : [html]);
        setDocxPage(1);
        setLoading(false);
      } catch (e) {
        setError('Failed to render DOCX.');
        setLoading(false);
      }
    };
    renderDocx();
  }, [docxBlob]);

  if (!filePath) return (
    <Box p={4} sx={{ textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>{t('welcome_to_docs_viewer')}</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {t('docs_viewer_intro')}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {t('docs_viewer_tip')}
      </Typography>
    </Box>
  );
  if (loading) return <Box p={2}><CircularProgress /></Box>;
  if (error) return <Box p={2} color="error.main">{error}</Box>;

  // Helper to render PDF outline (TOC)
  const renderOutline = (outline) => {
    if (!outline || outline.length === 0) return null;
    return (
      <List dense sx={{ mb: 2, maxHeight: 300, overflow: 'auto', border: '1px solid #eee', borderRadius: 1 }}>
        {outline.map((item, idx) => (
          <ListItem
            button
            key={item.title + idx}
            onClick={async () => {
              if (item.dest) {
                let dest = item.dest;
                if (typeof dest === 'string') dest = await pdfDoc.getDestination(dest);
                const pageNumber = dest && dest[0] && dest[0].num !== undefined ? dest[0].num : (dest && dest[0] && dest[0].id ? pdfDoc._pdfInfo.destinations[dest[0].id] : null);
                if (typeof pageNumber === 'number') setPdfPage(pageNumber);
                else if (item.pageNumber) setPdfPage(item.pageNumber);
              } else if (item.items && item.items.length > 0) {
                // Expand/collapse logic could go here
              }
            }}
            sx={{ pl: (item.level || 0) * 2 }}
          >
            <ListItemText primary={item.title} />
          </ListItem>
        ))}
      </List>
    );
  };

  // Render based on file type
  const ext = fileType || (filePath ? filePath.split('.').pop().toLowerCase() : '');
  if (ext === 'md') {
    // Paging logic for markdown
    let pageContent = content;
    const lines = content.split('\n');
    if (numPages > 1) {
      const startLine = (page - 1) * PAGE_SIZE_LINES;
      const endLine = startLine + PAGE_SIZE_LINES;
      pageContent = lines.slice(startLine, endLine).join('\n');
    }
    return (
      <Box p={2} sx={{ maxWidth: 800, margin: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <ReactMarkdown>{pageContent}</ReactMarkdown>
        </Box>
        {numPages > 1 && (
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" mt={2}>
            <Button onClick={() => setPage(1)} disabled={page === 1}>First</Button>
            <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Typography variant="body2">Page {page} / {numPages}</Typography>
            <Button onClick={() => setPage((p) => Math.min(numPages, p + 1))} disabled={page === numPages}>Next</Button>
            <Button onClick={() => setPage(numPages)} disabled={page === numPages}>Last</Button>
          </Stack>
        )}
      </Box>
    );
  } else if (ext === 'txt') {
    return <Box p={2} sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{content}</Box>;
  } else if (ext === 'pdf') {
    return (
      <Box p={2}>
        {renderOutline(pdfOutline)}
        <canvas ref={pdfCanvasRef} style={{ width: '100%', border: '1px solid #ccc' }} />
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" mt={2}>
          <Button onClick={() => setPdfPage(1)} disabled={pdfPage === 1}>First</Button>
          <Button onClick={() => setPdfPage((p) => Math.max(1, p - 1))} disabled={pdfPage === 1}>Previous</Button>
          <Typography variant="body2">Page {pdfPage} / {pdfNumPages}</Typography>
          <Button onClick={() => setPdfPage((p) => Math.min(pdfNumPages, p + 1))} disabled={pdfPage === pdfNumPages}>Next</Button>
          <Button onClick={() => setPdfPage(pdfNumPages)} disabled={pdfPage === pdfNumPages}>Last</Button>
        </Stack>
        <Typography variant="caption">PDF document. Use TOC or navigation buttons to browse pages.</Typography>
      </Box>
    );
  } else if (ext === 'docx') {
    return (
      <Box p={2}>
        <div dangerouslySetInnerHTML={{ __html: docxPages[docxPage - 1] || content }} />
        {docxPages.length > 1 && (
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" mt={2}>
            <Button onClick={() => setDocxPage(1)} disabled={docxPage === 1}>First</Button>
            <Button onClick={() => setDocxPage((p) => Math.max(1, p - 1))} disabled={docxPage === 1}>Previous</Button>
            <Typography variant="body2">Page {docxPage} / {docxPages.length}</Typography>
            <Button onClick={() => setDocxPage((p) => Math.min(docxPages.length, p + 1))} disabled={docxPage === docxPages.length}>Next</Button>
            <Button onClick={() => setDocxPage(docxPages.length)} disabled={docxPage === docxPages.length}>Last</Button>
          </Stack>
        )}
        <Typography variant="caption">DOCX rendered as HTML. Use navigation buttons to browse pages.</Typography>
      </Box>
    );
  } else {
    return <Box p={2}>Unsupported file type.</Box>;
  }
};

export default FileViewer; 