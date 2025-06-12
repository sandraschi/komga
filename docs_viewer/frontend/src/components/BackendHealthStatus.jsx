import React from 'react';
import { Box, Typography, Chip, List, ListItem, ListItemText, Divider, Alert } from '@mui/material';
import { useLanguage } from '../context/LanguageContext';

export default function BackendHealthStatus({ details, error }) {
  const { t } = useLanguage();

  if (!details) return <Box p={2}><Typography color="text.secondary">{t('no_health_details')}</Typography></Box>;
  return (
    <Box p={2}>
      <Typography variant="h6" gutterBottom>{t('backend_health_status')}</Typography>
      {error && (
        error.startsWith('Warning:') ? (
          <Alert severity="warning" sx={{ mb: 2 }}>{error.replace('Warning:', '')}</Alert>
        ) : (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )
      )}
      <List>
        <ListItem>
          <ListItemText primary={t('node_modules')} secondary={details.node_modules} />
          <Chip label={details.node_modules === 'ok' ? t('ok') : details.node_modules} color={details.node_modules === 'ok' ? 'success' : 'error'} />
        </ListItem>
        <ListItem>
          <ListItemText primary={t('database')} secondary={details.db} />
          <Chip label={details.db === 'ok' ? t('ok') : details.db} color={details.db === 'ok' ? 'success' : 'error'} />
        </ListItem>
      </List>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1">{t('llm_providers')}</Typography>
      <List>
        {details.llm && Object.entries(details.llm).map(([llm, info]) => (
          <ListItem key={llm} alignItems="flex-start">
            <ListItemText
              primary={llm.toUpperCase()}
              secondary={
                <>
                  <Typography variant="body2">{t('reachable')}: {info.reachable ? 'Yes' : 'No'}</Typography>
                  <Typography variant="body2">{t('loaded_model')}: {info.hasLoadedModel ? 'Yes' : 'No'}</Typography>
                  <Typography variant="body2">{t('models')}: {Array.isArray(info.models) && info.models.length > 0 ? info.models.join(', ') : 'None'}</Typography>
                </>
              }
            />
            <Box>
              <Chip label={info.reachable ? t('reachable') : t('unreachable')} color={info.reachable ? 'success' : 'error'} sx={{ mr: 1 }} />
              <Chip label={info.hasLoadedModel ? t('model_loaded') : t('no_model')} color={info.hasLoadedModel ? 'success' : 'error'} />
            </Box>
          </ListItem>
        ))}
      </List>
    </Box>
  );
} 