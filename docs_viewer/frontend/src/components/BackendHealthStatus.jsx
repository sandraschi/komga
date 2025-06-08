import React from 'react';
import { Box, Typography, Chip, List, ListItem, ListItemText, Divider, Alert } from '@mui/material';

export default function BackendHealthStatus({ details, error }) {
  if (!details) return <Box p={2}><Typography color="text.secondary">No health details available.</Typography></Box>;
  return (
    <Box p={2}>
      <Typography variant="h6" gutterBottom>Backend Health Status</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <List>
        <ListItem>
          <ListItemText primary="Node Modules" secondary={details.node_modules} />
          <Chip label={details.node_modules === 'ok' ? 'OK' : details.node_modules} color={details.node_modules === 'ok' ? 'success' : 'error'} />
        </ListItem>
        <ListItem>
          <ListItemText primary="Database" secondary={details.db} />
          <Chip label={details.db === 'ok' ? 'OK' : details.db} color={details.db === 'ok' ? 'success' : 'error'} />
        </ListItem>
      </List>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1">LLM Providers</Typography>
      <List>
        {details.llm && Object.entries(details.llm).map(([llm, info]) => (
          <ListItem key={llm} alignItems="flex-start">
            <ListItemText
              primary={llm.toUpperCase()}
              secondary={
                <>
                  <Typography variant="body2">Reachable: {info.reachable ? 'Yes' : 'No'}</Typography>
                  <Typography variant="body2">Loaded Model: {info.hasLoadedModel ? 'Yes' : 'No'}</Typography>
                  <Typography variant="body2">Models: {Array.isArray(info.models) && info.models.length > 0 ? info.models.join(', ') : 'None'}</Typography>
                </>
              }
            />
            <Box>
              <Chip label={info.reachable ? 'Reachable' : 'Unreachable'} color={info.reachable ? 'success' : 'error'} sx={{ mr: 1 }} />
              <Chip label={info.hasLoadedModel ? 'Model Loaded' : 'No Model'} color={info.hasLoadedModel ? 'success' : 'error'} />
            </Box>
          </ListItem>
        ))}
      </List>
    </Box>
  );
} 