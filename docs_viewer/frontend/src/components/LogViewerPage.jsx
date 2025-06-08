import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Typography, Paper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function LogViewerPage() {
  const [log, setLog] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setError(null);
    axios.get('/api/logs?lines=500')
      .then(res => setLog(res.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box p={2}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Back
      </Button>
      <Typography variant="h6" gutterBottom>Backend Logs</Typography>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Paper sx={{ p: 2, maxHeight: 600, overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 14 }}>
          {log}
        </Paper>
      )}
    </Box>
  );
} 