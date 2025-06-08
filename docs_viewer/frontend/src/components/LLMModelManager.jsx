import React, { useEffect, useState } from 'react';
import { Box, Button, Select, MenuItem, Typography, CircularProgress, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Chip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';

// ErrorBoundary for this component
class LocalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // Log error to console for debugging
    console.error('LLMModelManager error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <Box p={2} color="error.main">
          <Typography variant="h6" color="error">An error occurred in LLM Model Manager</Typography>
          <Typography variant="body2" color="error">{this.state.error?.message || String(this.state.error)}</Typography>
        </Box>
      );
    }
    return this.props.children;
  }
}

const LLMModelManager = ({ onModelSelect, activeBackend, activeModel }) => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(activeBackend || '');
  const [selectedModel, setSelectedModel] = useState(activeModel || '');

  const fetchProviders = () => {
    setLoading(true);
    setError(null);
    axios
      .get('/api/llm/providers')
      .then((res) => setProviders(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  // Auto-select first running provider if none is selected
  useEffect(() => {
    if (providers.length > 0 && !selectedProvider) {
      const firstRunning = providers.find((p) => p.running) || providers[0];
      if (firstRunning) setSelectedProvider(firstRunning.provider);
    }
  }, [providers, selectedProvider]);

  // When provider changes, reset model selection
  useEffect(() => {
    setSelectedModel('');
  }, [selectedProvider]);

  // Ensure selectedProvider is always a valid value in the providers list
  useEffect(() => {
    if (Array.isArray(providers) && providers.length > 0) {
      const valid = providers.some((p) => p.provider === selectedProvider);
      if (!valid) {
        const firstRunning = providers.find((p) => p.running) || providers[0];
        setSelectedProvider(firstRunning ? firstRunning.provider : '');
      }
    }
  }, [providers, selectedProvider]);

  const handleProviderChange = (e) => {
    setSelectedProvider(e.target.value);
  };

  const handleModelSelect = (model) => {
    setSelectedModel(model);
    if (onModelSelect) onModelSelect(selectedProvider, model);
  };

  const handleRefresh = () => {
    fetchProviders();
  };

  const handleLoad = (provider, model) => {
    axios.post('/api/llm/load', { backend: provider, model }).then(fetchProviders);
  };
  const handleUnload = (provider, model) => {
    axios.post('/api/llm/unload', { backend: provider, model }).then(fetchProviders);
  };

  return (
    <Box p={2}>
      <Typography variant="h6">LLM Model Manager</Typography>
      <Box mt={2} display="flex" alignItems="center">
        <Typography variant="subtitle2" sx={{ mr: 2 }}>Provider:</Typography>
        {Array.isArray(providers) && providers.length === 0 ? (
          <Typography color="text.secondary">No providers available.</Typography>
        ) : (
          <Select
            value={Array.isArray(providers) && providers.some((p) => p.provider === selectedProvider) ? selectedProvider : (providers[0]?.provider || '')}
            onChange={handleProviderChange}
            sx={{ minWidth: 140 }}
          >
            {(Array.isArray(providers) ? providers : []).map((p) => (
              <MenuItem key={p.provider} value={p.provider} disabled={!p.running}>
                {p.provider.toUpperCase()} {p.running ? '' : '(not running)'}
              </MenuItem>
            ))}
          </Select>
        )}
        <IconButton onClick={handleRefresh} sx={{ ml: 1 }}><RefreshIcon /></IconButton>
      </Box>
      {loading ? (
        <Box mt={2}><CircularProgress /></Box>
      ) : error ? (
        <Typography color="error" mt={2}>{error}</Typography>
      ) : (
        <>
          <Box mt={2}>
            <Typography variant="subtitle2">Providers:</Typography>
            {Array.isArray(providers) && providers.length > 0 ? (
              <List>
                {providers.map((p) => (
                  <ListItem key={p.provider}>
                    <ListItemText
                      primary={p.provider.toUpperCase()}
                      secondary={
                        p.running
                          ? 'Running'
                          : p.error
                            ? `Not running: ${p.error}`
                            : 'Detected but not running'
                      }
                    />
                    <ListItemSecondaryAction>
                      {p.running ? (
                        <Chip label="Running" color="success" />
                      ) : (
                        <Chip label="Not running" color="error" />
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">No providers detected.</Typography>
            )}
          </Box>
          {(Array.isArray(providers) ? providers : []).map((p) => {
            return (
              <Box key={p.provider} mt={2} mb={2} p={1} border={1} borderColor={p.running ? 'success.light' : 'grey.400'} borderRadius={2}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle1">{p.provider.toUpperCase()}</Typography>
                  <Chip label={p.running ? 'Running' : 'Not running'} color={p.running ? 'success' : 'default'} size="small" />
                  <Typography variant="caption" sx={{ ml: 2 }}>{p.url}</Typography>
                </Box>
                {p.running && (
                  <List dense>
                    {Array.isArray(p.models) && p.models.length > 0 ? p.models.map((model) => {
                      // Support both {id, name} and string
                      const modelId = model.id || model.name || model;
                      return (
                        <ListItem key={modelId} selected={selectedProvider === p.provider && selectedModel === modelId} button onClick={() => { setSelectedProvider(p.provider); handleModelSelect(modelId); }}>
                          <ListItemText
                            primary={modelId}
                            secondary={model.size ? `Size: ${model.size}` : ''}
                          />
                          <ListItemSecondaryAction>
                            <Button size="small" onClick={() => handleLoad(p.provider, modelId)}>Load</Button>
                            <Button size="small" onClick={() => handleUnload(p.provider, modelId)}>Unload</Button>
                          </ListItemSecondaryAction>
                        </ListItem>
                      );
                    }) : (
                      <ListItem><ListItemText primary="No models found" /></ListItem>
                    )}
                  </List>
                )}
              </Box>
            );
          })}
        </>
      )}
      <Box mt={2}>
        <Typography variant="subtitle2">Active Provider/Model:</Typography>
        <Typography variant="body2">
          {selectedProvider || <i>None</i>} / {selectedModel || <i>None</i>}
        </Typography>
      </Box>
    </Box>
  );
};

// Wrap the export in the error boundary
export default function LLMModelManagerWithBoundary(props) {
  return (
    <LocalErrorBoundary>
      <LLMModelManager {...props} />
    </LocalErrorBoundary>
  );
} 