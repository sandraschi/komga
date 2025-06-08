import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, AppBar, Toolbar, Typography, IconButton, Button, Grid, Drawer, Snackbar, Alert, Dialog, DialogTitle, DialogContent, Tabs, Tab, CircularProgress } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SettingsIcon from '@mui/icons-material/Settings';
import FileTree from './components/FileTree';
import FileViewer from './components/FileViewer';
import MetadataPanel from './components/MetadataPanel';
import LLMModelManager from './components/LLMModelManager';
import ChatWindow from './components/ChatWindow';
import ChatIcon from '@mui/icons-material/Chat';
import ListAltIcon from '@mui/icons-material/ListAlt';
import useBackendStatus from './components/useBackendStatus';
import BackendHealthStatus from './components/BackendHealthStatus';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import LogViewerPage from './components/LogViewerPage';

// TODO: Import components for FileTree, FileViewer, MetadataPanel, FolderPicker, etc.

// --- Frontend log buffer ---
const frontendLogBuffer = [];
const MAX_LOG_LINES = 500;
function pushFrontendLog(level, ...args) {
  const msg = `[${new Date().toISOString()}] [${level}] ` + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a, null, 2))).join(' ');
  frontendLogBuffer.push(msg);
  if (frontendLogBuffer.length > MAX_LOG_LINES) frontendLogBuffer.shift();
}
['log', 'error', 'warn'].forEach((level) => {
  const orig = console[level];
  console[level] = (...args) => {
    pushFrontendLog(level, ...args);
    orig.apply(console, args);
  };
});

function LogViewerErrorBoundary({ open, onClose, children }) {
  const [error, setError] = useState(null);
  if (error) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Logs</DialogTitle>
        <DialogContent dividers>
          <Box color="error.main">An error occurred in the log viewer: {error.message || error.toString()}</Box>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <React.Suspense fallback={<Dialog open={open} onClose={onClose}><DialogContent>Loading logs...</DialogContent></Dialog>}>
      {React.cloneElement(children, { onError: setError })}
    </React.Suspense>
  );
}

function LogViewerModal({ open, onClose, onError }) {
  const [tab, setTab] = useState(0);
  const [backendLog, setBackendLog] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBackendLog = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/logs?lines=200');
      if (!res.ok) throw new Error('Failed to fetch backend log');
      const text = await res.text();
      setBackendLog(text);
    } catch (e) {
      setError(e.message);
      if (onError) onError(e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (open && tab === 0) fetchBackendLog();
  }, [open, tab]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Logs</DialogTitle>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Backend Log" />
        <Tab label="Frontend Log" />
      </Tabs>
      <DialogContent dividers sx={{ minHeight: 400, fontFamily: 'monospace' }}>
        {tab === 0 && (
          loading ? <CircularProgress /> :
          error ? (
            <Box color="error.main">
              <Typography variant="body1" color="error">{error}</Typography>
              <Button onClick={fetchBackendLog} sx={{ mt: 2 }} variant="outlined">Retry</Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                If the backend is unhealthy, check the health status banner for details.
              </Typography>
            </Box>
          ) : (backendLog ? <pre style={{ whiteSpace: 'pre-wrap' }}>{backendLog}</pre> : <Box color="text.secondary">No backend log data.</Box>)
        )}
        {tab === 1 && (
          frontendLogBuffer.length > 0 ? <pre style={{ whiteSpace: 'pre-wrap' }}>{frontendLogBuffer.join('\n')}</pre> : <Box color="text.secondary">No frontend log data.</Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ErrorBoundary({ children }) {
  const [error, setError] = useState(null);
  if (error) {
    return <Box p={4} color="error.main">An error occurred: {error.message}</Box>;
  }
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      {children}
    </React.Suspense>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [root, setRoot] = useState(undefined); // undefined = default backend folder
  const [selectedFile, setSelectedFile] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [llmBackend, setLlmBackend] = useState('ollama');
  const [llmModel, setLlmModel] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [chatOpen, setChatOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const navigate = useNavigate();

  // Backend health
  const backend = useBackendStatus();

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
    },
  });

  // Folder picker using File System Access API if available
  const handleFolderChange = async () => {
    if (window.showDirectoryPicker) {
      try {
        const dirHandle = await window.showDirectoryPicker();
        setRoot(dirHandle.name); // For demo, just use name; real impl: pass handle to backend
        setSnackbar({ open: true, message: `Selected folder: ${dirHandle.name}`, severity: 'success' });
      } catch (e) {
        // Fallback to manual input if cancelled or failed
        const manual = window.prompt('Enter folder path to use as root:');
        if (manual && manual.trim()) {
          setRoot(manual.trim());
          setSnackbar({ open: true, message: `Selected folder: ${manual.trim()}`, severity: 'success' });
        } else {
          setSnackbar({ open: true, message: 'Folder selection cancelled or failed.', severity: 'warning' });
        }
      }
    } else {
      // Fallback to manual input
      const manual = window.prompt('Enter folder path to use as root:');
      if (manual && manual.trim()) {
        setRoot(manual.trim());
        setSnackbar({ open: true, message: `Selected folder: ${manual.trim()}`, severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Folder selection cancelled or failed.', severity: 'warning' });
      }
    }
  };

  // LLM model selection handler
  const handleModelSelect = (backend, model) => {
    setLlmBackend(backend);
    setLlmModel(model);
    setSnackbar({ open: true, message: `Selected model: ${model} (${backend})`, severity: 'info' });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* Backend status banner */}
      {backend.status !== 'ok' && (
        <Box sx={{ bgcolor: 'error.main', color: 'error.contrastText', p: 1, textAlign: 'center', zIndex: 2000 }}>
          <Typography variant="body2">
            Backend not reachable: {backend.error || 'Unknown error'}
            <Button onClick={backend.retry} sx={{ ml: 2 }} size="small" variant="contained" color="inherit">Retry</Button>
          </Typography>
          <BackendHealthStatus details={backend.details} error={backend.error} />
        </Box>
      )}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            docs_viewer
          </Typography>
          <Button color="inherit" onClick={handleFolderChange} disabled={backend.status !== 'ok'}>
            Select Folder
          </Button>
          <IconButton color="inherit" onClick={() => setLogModalOpen(true)} title="View Logs">
            <ListAltIcon />
          </IconButton>
          <IconButton color="inherit" onClick={() => setChatOpen(true)} disabled={backend.status !== 'ok'}>
            <ChatIcon />
          </IconButton>
          <IconButton color="inherit" onClick={() => setDrawerOpen(true)}>
            <SettingsIcon />
          </IconButton>
          <IconButton color="inherit" onClick={() => setDarkMode((m) => !m)}>
            {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <LogViewerErrorBoundary open={logModalOpen} onClose={() => setLogModalOpen(false)}>
        <LogViewerModal open={logModalOpen} onClose={() => setLogModalOpen(false)} />
      </LogViewerErrorBoundary>
      <ChatWindow open={chatOpen} onClose={() => setChatOpen(false)} backend={llmBackend} model={llmModel} />
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <LLMModelManager
          onModelSelect={handleModelSelect}
          activeBackend={llmBackend}
          activeModel={llmModel}
        />
      </Drawer>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
      <ErrorBoundary>
        <Grid container spacing={0} sx={{ height: 'calc(100vh - 64px)', minHeight: '0' }}>
          {/* Left: File Tree */}
          <Grid item xs={12} sm={3} md={2} sx={{ borderRight: 1, borderColor: 'divider', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
            <FileTree
              root={root}
              onSelect={setSelectedFile}
              onFolderChange={handleFolderChange}
              disabled={backend.status !== 'ok'}
            />
          </Grid>
          {/* Center: File Viewer */}
          <Grid item xs={12} sm={6} md={7} sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
            <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              <FileViewer
                filePath={selectedFile}
                root={root}
                disabled={backend.status !== 'ok'}
              />
            </Box>
          </Grid>
          {/* Right: Metadata Panel */}
          <Grid item xs={12} sm={3} md={3} sx={{ borderLeft: 1, borderColor: 'divider', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
            <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              <MetadataPanel
                filePath={selectedFile}
                root={root}
                disabled={backend.status !== 'ok'}
              />
            </Box>
          </Grid>
        </Grid>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default function AppWithRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/logs" element={<LogViewerPage />} />
      </Routes>
    </Router>
  );
}
