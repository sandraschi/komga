import React, { useEffect, useState } from 'react';
import { TreeView, TreeItem } from '@mui/x-tree-view';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Avatar from '@mui/material/Avatar';
import InputBase from '@mui/material/InputBase';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { useLanguage } from '../context/LanguageContext';
import logger from '../utils/logger';

// Helper to render tree recursively
function renderTree(nodes, onSelect) {
  if (!Array.isArray(nodes)) return null;
  return nodes.map((node) => (
    <TreeItem
      key={node.path}
      nodeId={node.path}
      label={
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {node.cover ? (
            <Avatar src={`/api/cover?path=${encodeURIComponent(node.cover)}`} sx={{ width: 24, height: 24, mr: 1 }} />
          ) : node.type === 'folder' ? <FolderIcon sx={{ mr: 1 }} /> : <DescriptionIcon sx={{ mr: 1 }} />}
          <Typography variant="body2">{node.name}</Typography>
        </Box>
      }
      onClick={(e) => {
        e.stopPropagation();
        if (node.type === 'file') onSelect(node.path);
      }}
    >
      {node.children ? renderTree(node.children, onSelect) : null}
    </TreeItem>
  ));
}

const DUMMY_TREE = [
  {
    type: 'folder',
    name: 'Demo Folder',
    path: 'demo-folder',
    children: [
      { type: 'file', name: 'Welcome.md', path: 'demo-folder/Welcome.md' },
      { type: 'file', name: 'Readme.txt', path: 'demo-folder/Readme.txt' },
      {
        type: 'folder',
        name: 'Subfolder',
        path: 'demo-folder/subfolder',
        children: [
          { type: 'file', name: 'Notes.md', path: 'demo-folder/subfolder/Notes.md' }
        ]
      }
    ]
  },
  { type: 'file', name: 'About.txt', path: 'About.txt' }
];

// Never use console directly. Use logger for all logging.
function logFileTree(...args) {
  const msg = '[FileTree] ' + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a, null, 2))).join(' ');
  logger.info(msg);
}

const FileTree = ({ root, onSelect, onFolderChange, disabled }) => {
  const { t } = useLanguage();
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDummy, setIsDummy] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(root || '/');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search) return setSearchResults(null);
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/search', { params: { q: search, root } });
      setSearchResults(res.data);
    } catch (err) {
      setError('Search failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openFolderDialog = async () => {
    // Try native picker first
    if (window.showDirectoryPicker) {
      try {
        const dirHandle = await window.showDirectoryPicker();
        setCurrentFolder(dirHandle.name);
        setFolderDialogOpen(false);
        if (onFolderChange) onFolderChange(dirHandle.name);
        return;
      } catch (e) {
        // Fallback to custom dialog
      }
    }
    // Fallback: fetch subfolders and show dialog
    try {
      const res = await axios.get('/api/tree', { params: { root: currentFolder } });
      const subfolders = (res.data || []).filter(f => f.type === 'folder');
      setFolders(subfolders);
      setFolderDialogOpen(true);
    } catch (e) {
      setFolders([]);
      setFolderDialogOpen(true);
    }
  };

  const handleFolderSelect = (folder) => {
    setCurrentFolder(folder.path);
    setFolderDialogOpen(false);
    if (onFolderChange) onFolderChange(folder.path);
  };

  useEffect(() => {
    if (disabled) return;
    setLoading(true);
    setError(null);
    setIsDummy(false);
    logFileTree('Pinging backend at /api/ping');
    axios.get('/api/ping')
      .then(() => {
        logFileTree('Backend is up, requesting /api/tree', { root });
        return axios.get('/api/tree', { params: { root } });
      })
      .then((res) => {
        logFileTree('Response from /api/tree', res && res.data);
        if (Array.isArray(res.data) && res.data.length > 0) {
          setTree(res.data);
        } else {
          logFileTree('Empty or invalid data, using DUMMY_TREE');
          setTree(DUMMY_TREE);
          setIsDummy(true);
        }
      })
      .catch((err) => {
        logFileTree('Backend not running or error from /api/ping or /api/tree', err.message);
        setError('Backend not running or unreachable.');
        setTree(DUMMY_TREE);
        setIsDummy(true);
      })
      .finally(() => setLoading(false));
  }, [root, disabled]);

  if (disabled) {
    return <Box p={2} color="text.secondary">File tree disabled: backend not available.</Box>;
  }

  let treeContent;
  try {
    treeContent = (
      <TreeView
        defaultCollapseIcon={<ExpandMoreIcon />}
        defaultExpandIcon={<ChevronRightIcon />}
        sx={{ flexGrow: 1, overflowY: 'auto' }}
      >
        {renderTree(tree, onSelect)}
      </TreeView>
    );
  } catch (e) {
    treeContent = <Typography color="error">An error occurred rendering the file tree.</Typography>;
  }

  return (
    <Box>
      <Button fullWidth variant="outlined" sx={{ mb: 2, borderRadius: 3, boxShadow: 1 }} onClick={openFolderDialog}>
        {t('select_folder')}
      </Button>
      <Dialog open={folderDialogOpen} onClose={() => setFolderDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('select_folder')}</DialogTitle>
        <DialogContent>
          {folders.length === 0 ? (
            <Typography>{t('no_subfolders_found')}</Typography>
          ) : (
            folders.map(folder => (
              <Button key={folder.path} fullWidth sx={{ my: 1 }} onClick={() => handleFolderSelect(folder)}>
                {folder.name}
              </Button>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFolderDialogOpen(false)}>{t('cancel')}</Button>
        </DialogActions>
      </Dialog>
      <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', alignItems: 'center', mb: 1, px: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <SearchIcon sx={{ mr: 1 }} />
        <InputBase
          placeholder={t('search_files_tags_authors_series')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ flex: 1 }}
        />
        <Button type="submit" size="small" variant="contained" sx={{ ml: 1 }}>{t('go')}</Button>
      </Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}><CircularProgress /></Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : searchResults ? (
        <TreeView defaultCollapseIcon={<ExpandMoreIcon />} defaultExpandIcon={<ChevronRightIcon />} sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {searchResults.map((r) => (
            <TreeItem key={r.file_path} nodeId={r.file_path} label={<Typography variant="body2">{r.title || r.file_path}</Typography>} onClick={() => onSelect(r.file_path)} />
          ))}
        </TreeView>
      ) : isDummy ? (
        <>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            {t('showing_demo_tree_backend_not_available')}
          </Typography>
          {treeContent}
        </>
      ) : treeContent}
    </Box>
  );
};

export default FileTree; 