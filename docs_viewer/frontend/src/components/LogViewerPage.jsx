import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Button, 
  CircularProgress, 
  Typography, 
  Paper, 
  TextField,
  Grid,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon, 
  Refresh as RefreshIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function LogViewerPage() {
  const [log, setLog] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lines, setLines] = useState(500);
  const navigate = useNavigate();

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/logs?lines=${lines}`);
      setLog(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load logs');
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRefresh = () => {
    fetchLogs();
  };

  const handleLinesChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setLines(Math.min(10000, value)); // Cap at 10,000 lines
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      fetchLogs();
    }
  };

  return (
    <Box p={2}>
      <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Grid item>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={() => navigate(-1)} 
            variant="outlined"
          >
            Back
          </Button>
        </Grid>
        <Grid item xs />
        <Grid item>
          <TextField
            label="Lines to show"
            type="number"
            size="small"
            value={lines}
            onChange={handleLinesChange}
            onKeyDown={handleKeyDown}
            inputProps={{ min: 1, max: 10000 }}
            sx={{ width: 150, mr: 1 }}
            variant="outlined"
          />
          <Tooltip title="Refresh logs">
            <IconButton 
              onClick={handleRefresh} 
              color="primary"
              disabled={loading}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" mb={1}>
          <InfoIcon color="info" sx={{ mr: 1 }} />
          <Typography variant="body2" color="textSecondary">
            Log file: {process.env.NODE_ENV === 'production' ? '/logs/combined.log' : 'C:\\Users\\sandr\\OneDrive\\Dokumente\\GitHub\\komga\\docs_viewer\\logs\\combined.log'}
          </Typography>
        </Box>
      </Paper>

      <Typography variant="h6" gutterBottom>Backend Logs</Typography>
      
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            backgroundColor: 'error.light',
            color: 'error.contrastText',
            mb: 2
          }}
        >
          <Typography variant="subtitle1">Error loading logs</Typography>
          <Typography variant="body2" component="pre" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
            {error}
          </Typography>
        </Paper>
      ) : (
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            maxHeight: '70vh', 
            overflow: 'auto', 
            whiteSpace: 'pre-wrap', 
            fontFamily: 'monospace', 
            fontSize: 14,
            backgroundColor: '#1e1e1e',
            color: '#f1f1f1'
          }}
        >
          {log || 'No log content available'}
        </Paper>
      )}
    </Box>
  );
}