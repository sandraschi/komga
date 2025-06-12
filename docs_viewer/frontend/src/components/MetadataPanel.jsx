import React, { useEffect, useState } from 'react';
import { Box, Chip, IconButton, Typography, TextField, Button, CircularProgress, Stack } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import Avatar from '@mui/material/Avatar';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';

const MetadataPanel = ({ filePath, root, disabled }) => {
  const { t } = useLanguage();
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [seriesInput, setSeriesInput] = useState('');
  const [authorsInput, setAuthorsInput] = useState('');

  useEffect(() => {
    if (!filePath) return;
    setLoading(true);
    setError(null);
    axios
      .get('/api/meta', { params: { path: filePath } })
      .then((res) => {
        setMeta(res.data);
        setSeriesInput(res.data.series || '');
        setAuthorsInput((res.data.authors || []).join(', '));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filePath, root]);

  const handleStar = () => {
    axios
      .post('/api/meta', { file_path: filePath, tags: meta?.tags, starred: !meta?.starred, comments: meta?.comments })
      .then(() => setMeta((m) => ({ ...m, starred: m?.starred ? 0 : 1 })))
      .catch((err) => setError(err.message));
  };

  const handleAddTag = () => {
    if (!tagInput) return;
    const tags = meta?.tags ? meta.tags.split(',').filter(Boolean) : [];
    if (tags.includes(tagInput)) return;
    const newTags = [...tags, tagInput].join(',');
    axios
      .post('/api/meta', { file_path: filePath, tags: newTags, starred: meta?.starred, comments: meta?.comments })
      .then(() => setMeta((m) => ({ ...m, tags: newTags })))
      .catch((err) => setError(err.message));
    setTagInput('');
  };

  const handleDeleteTag = (tag) => {
    const tags = meta?.tags ? meta.tags.split(',').filter(Boolean) : [];
    const newTags = tags.filter((t) => t !== tag).join(',');
    axios
      .post('/api/meta', { file_path: filePath, tags: newTags, starred: meta?.starred, comments: meta?.comments })
      .then(() => setMeta((m) => ({ ...m, tags: newTags })))
      .catch((err) => setError(err.message));
  };

  const handleAddComment = () => {
    if (!commentInput) return;
    let comments = [];
    try { comments = JSON.parse(meta?.comments || '[]'); } catch { comments = []; }
    const newComments = [...comments, { text: commentInput, date: new Date().toISOString() }];
    axios
      .post('/api/meta', { file_path: filePath, tags: meta?.tags, starred: meta?.starred, comments: newComments })
      .then(() => setMeta((m) => ({ ...m, comments: JSON.stringify(newComments) })))
      .catch((err) => setError(err.message));
    setCommentInput('');
  };

  const handleSetStars = (stars) => {
    axios
      .post('/api/meta', { file_path: filePath, tags: meta?.tags, comments: meta?.comments, stars })
      .then(() => setMeta((m) => ({ ...m, stars })))
      .catch((err) => setError(err.message));
  };

  const handleSetComments = (comments) => {
    axios
      .post('/api/meta', { file_path: filePath, tags: meta?.tags, starred: meta?.starred, comments })
      .then(() => setMeta((m) => ({ ...m, comments })))
      .catch((err) => setError(err.message));
  };

  const handleSummarize = async () => {
    if (!filePath) return;
    setAiLoading(true);
    setError(null);
    try {
      const res = await axios.post('/api/llm/summarize', { file_path: filePath });
      setMeta((m) => ({ ...m, ai_metadata: res.data.summary }));
    } catch (e) {
      setError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSetSeries = (series) => {
    axios
      .post('/api/meta', { file_path: filePath, series })
      .then(() => setMeta((m) => ({ ...m, series })))
      .catch((err) => setError(err.message));
    setSeriesInput(series);
  };

  const handleSetAuthors = (authors) => {
    const authorsArr = authors.split(',').map(a => a.trim()).filter(Boolean);
    axios
      .post('/api/meta', { file_path: filePath, authors: authorsArr })
      .then(() => setMeta((m) => ({ ...m, authors: authorsArr })))
      .catch((err) => setError(err.message));
    setAuthorsInput(authors);
  };

  const handleExport = async () => {
    try {
      const res = await axios.get('/api/meta/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'metadata_export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Export failed: ' + e.message);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await axios.post('/api/meta/import', { data });
      setError(null);
    } catch (e2) {
      setError('Import failed: ' + e2.message);
    }
  };

  if (disabled) return <Box p={2} color="text.secondary">Metadata panel disabled: backend not available.</Box>;
  if (!filePath) return <Box p={2}>Select a file to see metadata.</Box>;
  if (loading) return <Box p={2}><CircularProgress /></Box>;
  if (error) return <Box p={2} color="error.main">{error}</Box>;

  const tags = meta?.tags ? meta.tags.split(',').filter(Boolean) : [];
  let comments = [];
  try { comments = JSON.parse(meta?.comments || '[]'); } catch { comments = []; }

  const stars = typeof meta?.stars === 'number' ? meta.stars : (meta?.starred ? 5 : 0);

  return (
    <Box p={2}>
      <Typography variant="h6">{t('metadata')}</Typography>
      {meta?.cover && (
        <Box mt={2} mb={2} display="flex" justifyContent="center">
          <Avatar src={`/api/cover?path=${encodeURIComponent(meta.cover)}`} sx={{ width: 96, height: 128 }} variant="square" />
        </Box>
      )}
      {meta?.series !== undefined && (
        <Box mt={2}>
          <Typography variant="subtitle2">{t('series')}:</Typography>
          <TextField size="small" value={seriesInput} onChange={e => setSeriesInput(e.target.value)} onBlur={e => handleSetSeries(e.target.value)} fullWidth />
        </Box>
      )}
      {meta?.authors !== undefined && (
        <Box mt={2}>
          <Typography variant="subtitle2">{t('authors')}:</Typography>
          <TextField size="small" value={authorsInput} onChange={e => setAuthorsInput(e.target.value)} onBlur={e => handleSetAuthors(e.target.value)} fullWidth />
        </Box>
      )}
      <Box mt={2}>
        <Typography variant="subtitle2">{t('tags')}:</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {tags.map((tag) => (
            <Chip key={tag} label={tag} onDelete={() => handleDeleteTag(tag)} />
          ))}
        </Stack>
        <Box mt={1} display="flex">
          <TextField size="small" label={t('addTag')} value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
          <Button onClick={handleAddTag} sx={{ ml: 1 }}>{t('add')}</Button>
        </Box>
      </Box>
      <Box mt={2}>
        <Typography variant="subtitle2">{t('rating')}:</Typography>
        <Box>
          {[1,2,3,4,5].map((n) => (
            <IconButton key={n} onClick={() => handleSetStars(n)} color={n <= stars ? 'warning' : 'default'} size="large">
              {n <= stars ? <StarIcon /> : <StarBorderIcon />}
            </IconButton>
          ))}
        </Box>
      </Box>
      <Box mt={2}>
        <Typography variant="subtitle2">{t('comments')}</Typography>
        <TextField
          value={meta?.comments || ''}
          onChange={e => handleSetComments(e.target.value)}
          multiline
          minRows={3}
          maxRows={10}
          fullWidth
          variant="outlined"
          size="small"
        />
      </Box>
      <Box mt={2}>
        <Typography variant="subtitle2">{t('aiMetadata')}</Typography>
        <TextField
          value={meta?.ai_metadata || ''}
          multiline
          minRows={3}
          maxRows={10}
          fullWidth
          variant="outlined"
          size="small"
          InputProps={{ readOnly: true }}
          placeholder={t('noAIMetadataAvailable')}
        />
        <Box mt={1} display="flex" alignItems="center">
          <Button
            variant="contained"
            size="small"
            onClick={handleSummarize}
            disabled={aiLoading || !filePath}
          >
            {t('summarize')}
          </Button>
          {aiLoading && <CircularProgress size={20} sx={{ ml: 2 }} />}
        </Box>
      </Box>
      <Box mt={2} display="flex" gap={2}>
        <Button variant="outlined" onClick={handleExport}>{t('exportMetadata')}</Button>
        <Button variant="outlined" component="label">
          {t('importMetadata')}
          <input type="file" accept="application/json" hidden onChange={handleImport} />
        </Button>
      </Box>
      <Box mt={2}>
        <Typography variant="subtitle2">{t('file')}:</Typography>
        <Typography variant="body2">{filePath}</Typography>
      </Box>
    </Box>
  );
};

export default MetadataPanel; 