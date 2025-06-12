import React, { useState, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, CircularProgress, Box, Typography, IconButton, Slider, MenuItem, Select, FormControl, InputLabel, Paper, Divider, Avatar, Stack } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { useLanguage } from '../context/LanguageContext';

const creativityMarks = [
  { value: 0.1, label: 'Demure' },
  { value: 0.7, label: 'Balanced' },
  { value: 1.5, label: 'Insane' }
];
const lengthOptions = ['short', 'medium', 'long'];
const detailOptions = ['simple', 'detailed', 'highly detailed'];
const formalityOptions = ['formal', 'neutral', 'informal'];

const PERSONALITIES = [
  {
    label: 'Thoughtful Researcher',
    prompt: `You are a thoughtful, thorough academic researcher. You answer with evidence, cite sources, and always break your responses into clear, readable paragraphs. Avoid wall-of-text replies.`,
  },
  {
    label: 'Jesuit',
    prompt: `You are a Jesuit scholar, skilled in theology and debate. You use Socratic questioning, reference scripture, and break your responses into clear, readable paragraphs. Avoid wall-of-text replies.`,
  },
  {
    label: 'Buddha',
    prompt: `You are the Buddha, speaking with calm wisdom and compassion. You use parables and gentle guidance, and always break your responses into clear, readable paragraphs. Avoid wall-of-text replies.`,
  },
  {
    label: 'Ninja',
    prompt: `You are a mysterious ninja. You speak in short, cryptic sentences, use martial metaphors, and break your responses into clear, readable paragraphs. Avoid wall-of-text replies.`,
  },
  {
    label: 'Don Vito Corleone',
    prompt: `You are Don Vito Corleone, the Godfather. You speak with gravitas, offer wisdom in the form of veiled threats and family values, and always refer to people as 'my friend' or 'my child'. Break your responses into clear, readable paragraphs. Avoid wall-of-text replies.`,
  },
  {
    label: 'Alien from planet Znorg',
    prompt: `You are Zlarn, an alien from planet Znorg. You are fascinated by human customs, use odd metaphors, and sometimes misunderstand Earth idioms. Your advice is peppered with references to Znorgian culture and technology. Break your responses into clear, readable paragraphs. Avoid wall-of-text replies.`,
  },
  {
    label: 'Mystic Meg',
    prompt: `You are Mystic Meg, a fortune teller. You speak in riddles, make predictions, and use mystical language. Break your responses into clear, readable paragraphs. Avoid wall-of-text replies.`,
  },
  {
    label: 'Conspiracy Nut',
    prompt: `You are a conspiracy theorist. You connect unrelated facts, use dramatic language, and always break your responses into clear, readable paragraphs. Avoid wall-of-text replies.`,
  },
  {
    label: 'Flat Earther',
    prompt: `You are a flat earther. You are skeptical of mainstream science, use alternative explanations, and break your responses into clear, readable paragraphs. Avoid wall-of-text replies.`,
  },
  {
    label: 'Antivaxxer',
    prompt: `You are an antivaxxer. You distrust official sources, cite anecdotal evidence, and break your responses into clear, readable paragraphs. Avoid wall-of-text replies.`,
  },
  {
    label: 'Drug Kingpin',
    prompt: `You are a drug kingpin. You speak in coded language, reference the underworld, and break your responses into clear, readable paragraphs. Avoid wall-of-text replies.`,
  },
  {
    label: 'Pirate Captain',
    prompt: `You are a pirate captain. You use nautical slang, tell tall tales, and break your responses into clear, readable paragraphs. Avoid wall-of-text replies.`,
  },
];

function RefinePromptDialog({ open, onClose, onRefine, initialPrompt }) {
  const { t } = useLanguage();
  const [creativity, setCreativity] = useState(0.7);
  const [length, setLength] = useState('medium');
  const [detail, setDetail] = useState('detailed');
  const [formality, setFormality] = useState('neutral');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRefine = async () => {
    setLoading(true);
    setError(null);
    try {
      const refined = await onRefine({
        prompt: initialPrompt,
        creativity: creativity === 0.1 ? 'demure' : creativity === 1.5 ? 'insane' : 'balanced',
        length,
        detail,
        formality
      });
      onClose(refined);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(null)} maxWidth="xs" fullWidth>
      <DialogTitle>{t('refine_prompt')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1 }}>{t('adjust_refine_prompt')}</Typography>
        <Box sx={{ mb: 2 }}>
          <InputLabel shrink>{t('creativity')}</InputLabel>
          <Slider
            value={creativity}
            min={0.1}
            max={1.5}
            step={0.1}
            marks={creativityMarks}
            valueLabelDisplay="auto"
            onChange={(_, v) => setCreativity(v)}
            sx={{ mt: 2, mb: 1 }}
          />
        </Box>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>{t('length')}</InputLabel>
          <Select value={length} label={t('length')} onChange={e => setLength(e.target.value)}>
            {lengthOptions.map(opt => <MenuItem key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>{t('detail')}</InputLabel>
          <Select value={detail} label={t('detail')} onChange={e => setDetail(e.target.value)}>
            {detailOptions.map(opt => <MenuItem key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>{t('formality')}</InputLabel>
          <Select value={formality} label={t('formality')} onChange={e => setFormality(e.target.value)}>
            {formalityOptions.map(opt => <MenuItem key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</MenuItem>)}
          </Select>
        </FormControl>
        {loading && <Box sx={{ textAlign: 'center', mt: 2 }}><CircularProgress size={24} /></Box>}
        {error && <Typography color="error">{error}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(null)} disabled={loading}>{t('cancel')}</Button>
        <Button onClick={handleRefine} disabled={loading} variant="contained">{t('refine')}</Button>
      </DialogActions>
    </Dialog>
  );
}

function getSuggestions(lastPrompt, lastResponse) {
  // Simple static/contextual suggestions; can be LLM-generated in future
  return [
    'Summarize this',
    'List key points',
    'Explain in simpler terms'
  ];
}

export default function ChatWindow({ open, onClose, backend, model }) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refining, setRefining] = useState(false);
  const [refineDialog, setRefineDialog] = useState({ open: false, prompt: '' });
  const inputRef = useRef();
  const [personality, setPersonality] = useState(PERSONALITIES[0]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const sendMessage = async (prompt = input) => {
    if (!prompt.trim()) return;
    if (!backend || !model) {
      setError('Please select a provider and model before sending a prompt.');
      return;
    }
    const systemPrompt = showCustom && customPrompt ? customPrompt : personality.prompt;
    const userMsg = { role: 'user', content: prompt };
    const newMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
      userMsg
    ];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/llm/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider: backend, model, messages: newMessages })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(msgs => [...msgs, { role: 'assistant', content: data.response }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleRefine = (prompt) => {
    setRefineDialog({ open: true, prompt });
  };

  const doRefine = async ({ prompt, creativity, length, detail, formality }) => {
    setRefining(true);
    setError(null);
    try {
      const res = await fetch('/api/llm/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider: backend, model, creativity, length, detail, formality })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setInput(data.refined);
      return data.refined;
    } catch (e) {
      setError('Refine failed: ' + e.message);
      return null;
    } finally {
      setRefining(false);
      inputRef.current?.focus();
    }
  };

  const lastPrompt = messages.filter(m => m.role === 'user').slice(-1)[0]?.content;
  const lastResponse = messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content;
  const suggestions = lastPrompt && lastResponse ? getSuggestions(lastPrompt, lastResponse) : [];

  return (
    <Paper elevation={4} sx={{ maxWidth: 600, mx: 'auto', my: 4, p: 0, borderRadius: 4, boxShadow: 6, bgcolor: 'background.paper' }}>
      <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.default', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>{t('llm_chat')}</Typography>
        {onClose && (
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        )}
      </Box>
      <Divider />
      <Box sx={{ minHeight: 320, maxHeight: 400, overflowY: 'auto', px: 3, py: 2, bgcolor: 'background.default', borderRadius: 2 }}>
        {messages.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 6 }}>
            {t('start_conversation')}
          </Typography>
        ) : (
          <Stack spacing={2}>
            {messages.map((msg, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && (
                  <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36, fontSize: 18 }}>A</Avatar>
                )}
                <Paper sx={{ p: 2, bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper', color: msg.role === 'user' ? '#fff' : 'text.primary', borderRadius: 3, maxWidth: 420, boxShadow: 1, borderTopLeftRadius: msg.role === 'user' ? 16 : 3, borderTopRightRadius: msg.role === 'user' ? 3 : 16 }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{msg.content}</Typography>
                </Paper>
                {msg.role === 'user' && (
                  <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 18 }}>U</Avatar>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </Box>
      <Divider />
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, px: 3, py: 2, bgcolor: 'background.default', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
        <TextField
          fullWidth
          multiline
          minRows={1}
          maxRows={4}
          label={t('type_your_message')}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          inputRef={inputRef}
          sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
        />
        <Button variant="contained" color="primary" onClick={() => sendMessage()} disabled={loading || !input.trim()} sx={{ minWidth: 100, height: 48, borderRadius: 2, boxShadow: 2 }}>
          {loading ? <CircularProgress size={24} /> : t('send')}
        </Button>
      </Box>
      {error && <Typography color="error" sx={{ mt: 2, px: 3 }}>{error}</Typography>}
      <RefinePromptDialog
        open={refineDialog.open}
        initialPrompt={refineDialog.prompt}
        onClose={refined => {
          setRefineDialog({ open: false, prompt: '' });
          if (refined) setInput(refined);
        }}
        onRefine={doRefine}
      />
      <Box mb={2} px={3}>
        <Typography variant="subtitle2">{t('personality')}:</Typography>
        <Select
          value={personality.label}
          onChange={e => {
            const p = PERSONALITIES.find(p => p.label === e.target.value);
            setPersonality(p);
            setShowCustom(false);
          }}
        >
          {PERSONALITIES.map(p => (
            <MenuItem key={p.label} value={p.label}>{p.label}</MenuItem>
          ))}
          <MenuItem value="custom">{t('custom')}</MenuItem>
        </Select>
        {showCustom || personality.label === t('custom') ? (
          <TextField
            label={t('custom_system_prompt')}
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            multiline
            minRows={3}
            maxRows={10}
            fullWidth
            sx={{ mt: 1 }}
          />
        ) : (
          <Paper sx={{ mt: 1, maxHeight: 120, overflow: 'auto', p: 1, bgcolor: '#f5f5f5', fontFamily: 'monospace', fontSize: 14 }}>
            {personality.prompt}
          </Paper>
        )}
      </Box>
    </Paper>
  );
} 