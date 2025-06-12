import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Avatar, Paper, TextField, Button, MenuItem, Select, InputLabel, FormControl, Stack } from '@mui/material';
import { useLanguage } from '../context/LanguageContext';

// participants: [{ id, name, avatar, type: 'human'|'llm' }]
export default function MultiUserDebateChatWindow({ participants = [], chatId }) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sender, setSender] = useState(participants[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef();

  // Poll for new messages (stub)
  useEffect(() => {
    if (!chatId) return;
    const interval = setInterval(async () => {
      // TODO: Replace with real backend call
      // const res = await fetch(`/api/debate/messages?chatId=${chatId}`);
      // const data = await res.json();
      // setMessages(data.messages);
    }, 2000);
    return () => clearInterval(interval);
  }, [chatId]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);
    // TODO: Send message to backend
    setMessages(msgs => [...msgs, {
      sender,
      content: input,
      timestamp: new Date().toISOString(),
    }]);
    setInput('');
    setLoading(false);
  };

  const getParticipant = id => participants.find(p => p.id === id) || { name: 'Unknown', avatar: '', type: 'human' };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default', borderRadius: 3, boxShadow: 2 }}>
      <Box ref={chatRef} sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#f7f9fa', borderRadius: 3 }}>
        {messages.length === 0 && <Typography color="text.secondary">No messages yet. Start the debate!</Typography>}
        {messages.map((msg, i) => {
          const p = getParticipant(msg.sender);
          const isLLM = p.type === 'llm';
          return (
            <Stack key={i} direction={isLLM ? 'row-reverse' : 'row'} alignItems="flex-end" spacing={2} sx={{ mb: 2 }}>
              <Avatar src={p.avatar} sx={{ bgcolor: isLLM ? 'primary.main' : 'secondary.main', width: 40, height: 40 }}>{p.name[0]}</Avatar>
              <Paper elevation={3} sx={{ p: 2, borderRadius: 4, maxWidth: '60%', bgcolor: isLLM ? 'primary.light' : 'grey.100' }}>
                <Typography variant="subtitle2" color={isLLM ? 'primary.dark' : 'secondary.dark'}>{p.name}</Typography>
                <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>{msg.content}</Typography>
                <Typography variant="caption" color="text.secondary">{new Date(msg.timestamp).toLocaleTimeString()}</Typography>
              </Paper>
            </Stack>
          );
        })}
      </Box>
      <Box sx={{ p: 2, borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'background.paper', borderRadius: 3 }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Sender</InputLabel>
          <Select value={sender} label="Sender" onChange={e => setSender(e.target.value)}>
            {participants.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(); }}
          placeholder="Type your message..."
          fullWidth
          multiline
          minRows={1}
          maxRows={4}
          sx={{ borderRadius: 2, bgcolor: 'grey.50' }}
        />
        <Button variant="contained" onClick={handleSend} disabled={loading || !input.trim()}>Send</Button>
      </Box>
    </Box>
  );
} 