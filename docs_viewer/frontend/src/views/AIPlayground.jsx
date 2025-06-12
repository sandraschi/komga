import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Box, Typography, Paper, Drawer, IconButton, Divider, useMediaQuery, TextField, MenuItem, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LLMModelManager from '../components/LLMModelManager';
import ChatWindow from '../components/ChatWindow';
import FileTree from '../components/FileTree';
import FileViewer from '../components/FileViewer';
import MetadataPanel from '../components/MetadataPanel';
import { useLanguage } from '../context/LanguageContext';
import { DebateView } from '../components/debate';

const tabLabels = [
  'Setup / Settings',
  'Single LLM Chat',
  'Debate Mode',
  'Teams Debate',
  'Talk to Your Future Self',
  'Experiment Log / History',
  'Multimodal Chat',
  'RAG (Document Q&A)',
  'Multi-User Debate',
];

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AIPlayground() {
  const { t } = useLanguage();
  const [tab, setTab] = useState(0);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [folderPath, setFolderPath] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeBackend, setActiveBackend] = useState('');
  const [activeModel, setActiveModel] = useState('');
  const isMobile = useMediaQuery('(max-width:900px)');

  useEffect(() => { setRightOpen(false); }, []); // Minimize right panel by default

  // --- Debate Mode state ---
  const [debateTopic, setDebateTopic] = useState('The impact of AI on society');
  const [debateParticipants] = useState([
    {
      id: '1',
      name: 'AI Optimist',
      role: 'AI Assistant',
      avatar: '/avatars/ai1.png',
      description: 'Believes AI will have a positive impact on society',
      isActive: true,
      isMuted: false,
      isSpeaking: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      name: 'AI Skeptic',
      role: 'AI Assistant',
      avatar: '/avatars/ai2.png',
      description: 'Concerned about potential negative impacts of AI',
      isActive: true,
      isMuted: false,
      isSpeaking: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ]);
  const [debateSettings] = useState({
    turnDuration: 60,
    maxTurns: 10,
    allowInterruptions: true,
  });

  // --- Dueling LLMs state (kept for potential future use) ---

  // --- Future Self state ---
  const [persona, setPersona] = useState('granny');
  const [futureName, setFutureName] = useState('You');
  const [futureAge, setFutureAge] = useState(80);
  const [futureYears, setFutureYears] = useState(40);
  const [futureStory, setFutureStory] = useState('');
  const [futurePrompt, setFuturePrompt] = useState('');
  const personaOptions = [
    { value: 'granny', label: 'Mild-mannered Granny' },
    { value: 'murderer', label: 'Murderer on Death Row' },
    { value: 'emperor', label: 'Emperor of the Galaxy' },
    { value: 'scientist', label: 'World-changing Scientist' },
    { value: 'celebrity', label: 'Global Celebrity' },
    { value: 'hermit', label: 'Mountain Hermit' },
    { value: 'yourself', label: 'Just Yourself' },
  ];

  // --- Speech (TTS/STT) stubs ---
  const handleSpeak = (text) => {
    // TODO: Integrate FOSS TTS (e.g., Piper, Coqui TTS, OpenVoice)
    alert('TTS: ' + text);
  };
  const handleListen = () => {
    // TODO: Integrate FOSS STT (e.g., Whisper.cpp, Vosk)
    alert('STT: Start listening (stub)');
  };

  // --- Generate future self story (system prompt) ---
  const generateFutureStory = async () => {
    // TODO: Call LLM backend to generate a detailed fictional life story
    const story = `In the year ${new Date().getFullYear() + Number(futureYears)}, ${futureName} (${personaOptions.find(p=>p.value===persona)?.label || persona}) is now ${futureAge} years old. Their life has been a wild journey... [detailed fictional story here]`;
    setFutureStory(story);
    setFuturePrompt(story);
    logToBackend('info', `AIPlayground: Generated future self story for ${futureName} (${persona}), age ${futureAge}, +${futureYears} years.`);
  };

  // Log to backend activity log
  const logToBackend = (level, message) => {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message }),
    });
  };

  const handleFileSelect = (filePath) => {
    setSelectedFile(filePath);
    logToBackend('info', `AIPlayground: File selected: ${filePath}`);
    if (isMobile && rightOpen === false) setRightOpen(true);
  };

  const handleFolderChange = (folder) => {
    setFolderPath(folder);
    setSelectedFile(null);
    logToBackend('info', `AIPlayground: Folder changed: ${folder}`);
  };

  const handleTabChange = (_, v) => {
    setTab(v);
    logToBackend('info', `AIPlayground: Tab changed to ${tabLabels[v]}`);
  };

  const handleModelSelect = (backend, model) => {
    setActiveBackend(backend);
    setActiveModel(model);
    logToBackend('info', `AIPlayground: Model selected: ${backend} / ${model}`);
  };

  // --- RAG state ---
  const [ragFile, setRagFile] = useState(null);
  const [ragFilePath, setRagFilePath] = useState('');
  const [ragChunkSize, setRagChunkSize] = useState(512);
  const [ragChunkOverlap, setRagChunkOverlap] = useState(50);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState('');
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState(null);

  // --- File upload handler ---
  const handleRagFileChange = async (e) => {
    setRagError('');
    setRagResults(null);
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      setRagError('Only .txt and .md files are supported.');
      return;
    }
    setRagFile(file);
    // Upload file to backend static/docs folder (assume /docs is served or use a temp upload endpoint if available)
    // For now, save to /docs/uploaded/ and use the path for embedding
    setRagLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error || 'Upload failed');
      setRagFilePath(uploadJson.path);
    } catch (e) {
      setRagError('File upload failed: ' + e.message);
      setRagLoading(false);
      return;
    }
    setRagLoading(false);
  };

  // --- Chunk & Index handler ---
  const handleRagEmbed = async () => {
    setRagError('');
    setRagResults(null);
    if (!ragFilePath) { setRagError('No file uploaded.'); return; }
    setRagLoading(true);
    try {
      const res = await fetch('/api/rag/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: ragFilePath, max_tokens: ragChunkSize, overlap: ragChunkOverlap })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Embedding failed');
      setRagResults({ info: `Embedded ${json.chunks} chunks.` });
    } catch (e) {
      setRagError('Embedding failed: ' + e.message);
    }
    setRagLoading(false);
  };

  // --- Query handler ---
  const handleRagQuery = async () => {
    setRagError('');
    setRagResults(null);
    if (!ragQuery) { setRagError('Enter a question.'); return; }
    setRagLoading(true);
    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ragQuery })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Query failed');
      setRagResults(json.results);
    } catch (e) {
      setRagError('Query failed: ' + e.message);
    }
    setRagLoading(false);
  };

  // --- Multi-User Debate state ---
  const [debateUsers, setDebateUsers] = useState([]);
  const [debateLLMs, setDebateLLMs] = useState([]);
  const [debateAllUsers, setDebateAllUsers] = useState([]);
  const [debateLoading, setDebateLoading] = useState(false);
  const [debateChatId, setDebateChatId] = useState('');
  const [debateError, setDebateError] = useState('');

  // Fetch Teams users on mount
  useEffect(() => {
    if (tab !== 8) return;
    setDebateLoading(true);
    fetch('/api/teams/users').then(r => r.json()).then(data => {
      setDebateAllUsers(data.users || []);
      setDebateLoading(false);
    }).catch(e => { setDebateError('Failed to fetch Teams users'); setDebateLoading(false); });
  }, [tab]);

  // LLM options (stub)
  const llmOptions = [
    { id: 'llm1', name: 'LLM: Ollama (llama2)', type: 'llm', model: 'llama2', avatar: '' },
    { id: 'llm2', name: 'LLM: LM Studio (mistral)', type: 'llm', model: 'mistral', avatar: '' },
  ];

  const handleAddUser = user => {
    if (!debateUsers.find(u => u.id === user.id)) setDebateUsers([...debateUsers, { ...user, type: 'human', avatar: '', name: user.displayName || user.mail || user.id }]);
  };

  const handleRemoveUser = id => setDebateUsers(debateUsers.filter(u => u.id !== id));

  const handleAddLLM = llm => {
    if (!debateLLMs.find(l => l.id === llm.id)) setDebateLLMs([...debateLLMs, llm]);
  };

  const handleRemoveLLM = id => setDebateLLMs(debateLLMs.filter(l => l.id !== id));

  const handleStartDebate = async () => {
    setDebateLoading(true);
    setDebateError('');
    try {
      const res = await fetch('/api/debate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: debateUsers, llms: debateLLMs })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start debate');
      setDebateChatId(data.chatId);
    } catch (e) {
      setDebateError(e.message);
    }
    setDebateLoading(false);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
      {/* Left sidebar: File tree */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        anchor="left"
        open={leftOpen}
        onClose={() => setLeftOpen(false)}
        sx={{
          width: 280,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            borderRadius: '0 16px 16px 0',
            boxShadow: 4,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>{t('files')}</Typography>
          <IconButton onClick={() => setLeftOpen(false)}><ChevronLeftIcon /></IconButton>
        </Box>
        <Divider />
        <Box sx={{ p: 1 }}>
          <FileTree root={folderPath} onSelect={handleFileSelect} onFolderChange={handleFolderChange} />
        </Box>
      </Drawer>
      {!leftOpen && (
        <IconButton onClick={() => setLeftOpen(true)} sx={{ position: 'absolute', left: 0, top: 64, zIndex: 1000 }}>
          <MenuIcon />
        </IconButton>
      )}
      {/* Main content */}
      <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 4, boxShadow: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ mr: 2, display: 'inline' }}>{t('ai_playground')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'inline' }}>
              {folderPath ? `${t('folder')}: ${folderPath}` : t('no_folder_selected')}
              {selectedFile ? ` | ${t('file')}: ${selectedFile}` : ''}
            </Typography>
          </Box>
          <Box>
            <IconButton onClick={() => setRightOpen((v) => !v)}>
              {rightOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Box>
        </Paper>
        <Tabs value={tab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto" sx={{ borderRadius: 3, boxShadow: 1, mb: 1 }}>
          {tabLabels.map((label, i) => <Tab key={label} label={label} />)}
        </Tabs>
        <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Main tab content */}
          <Box sx={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
            <TabPanel value={tab} index={0}>
              <LLMModelManager onModelSelect={handleModelSelect} activeBackend={activeBackend} activeModel={activeModel} />
            </TabPanel>
            <TabPanel value={tab} index={1}>
              <ChatWindow open backend={activeBackend} model={activeModel} />
            </TabPanel>
            <TabPanel value={tab} index={2}>
              <Box sx={{ height: 'calc(100vh - 200px)' }}>
                <DebateView 
                  onClose={() => setTab(0)}
                  initialTopic={debateTopic}
                  initialParticipants={debateParticipants}
                  initialSettings={debateSettings}
                  onAddToChat={(message) => {
                    // Optional: Handle adding debate messages to main chat
                    console.log('Add to chat:', message);
                  }}
                />
              </Box>
            </TabPanel>
            <TabPanel value={tab} index={3}>
              <Typography variant="h6">{t('teams_debate')}</Typography>
              <Typography variant="body2" color="text.secondary">LLM joins a Teams chat, responds with RAG context. (Coming soon)</Typography>
            </TabPanel>
            <TabPanel value={tab} index={4}>
              <Typography variant="h6">{t('talk_to_future_self')}</Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Simulate a conversation with yourself in the future. Choose a persona, name, age, and years in the future. The LLM will generate a detailed fictional life story (not shown) and you can chat with your future self.</Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                  <TextField
                    select
                    label={t('persona')}
                    value={persona}
                    onChange={e => setPersona(e.target.value)}
                    sx={{ minWidth: 180 }}
                  >
                    {personaOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                  </TextField>
                  <TextField label={t('name')} value={futureName} onChange={e => setFutureName(e.target.value)} sx={{ minWidth: 120 }} />
                  <TextField label={t('age')} type="number" value={futureAge} onChange={e => setFutureAge(Number(e.target.value))} sx={{ minWidth: 80 }} />
                  <TextField label={t('years_in_future')} type="number" value={futureYears} onChange={e => setFutureYears(Number(e.target.value))} sx={{ minWidth: 120 }} />
                  <Button variant="contained" onClick={generateFutureStory}>{t('generate_life_story')}</Button>
                </Box>
                {futureStory && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
                    <Typography variant="subtitle2">({t('fictional_life_story_note')})</Typography>
                  </Box>
                )}
                <Box sx={{ mt: 2 }}>
                  <ChatWindow open backend={activeBackend} model={activeModel} />
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    <IconButton onClick={() => handleSpeak('Future Self Output')}><VolumeUpIcon /></IconButton>
                    <IconButton onClick={handleListen}><MicIcon /></IconButton>
                  </Box>
                </Box>
              </Box>
            </TabPanel>
            <TabPanel value={tab} index={5}>
              <Typography variant="h6">{t('experiment_log')}</Typography>
              <Typography variant="body2" color="text.secondary">Save, replay, export past sessions. (Coming soon)</Typography>
            </TabPanel>
            <TabPanel value={tab} index={6}>
              <Typography variant="h6">{t('multimodal_chat')}</Typography>
              <Typography variant="body2" color="text.secondary">Upload a picture or album, analyze and chat with a multimodal LLM. (Coming soon)</Typography>
            </TabPanel>
            <TabPanel value={tab} index={7}>
              <Typography variant="h6">RAG: Document Q&A</Typography>
              <Box sx={{ my: 2 }}>
                <Button variant="contained" component="label" disabled={ragLoading}>
                  Upload Document
                  <input type="file" hidden onChange={handleRagFileChange} />
                </Button>
                {ragFile && <Typography variant="body2" sx={{ ml: 2, display: 'inline' }}>{ragFile.name}</Typography>}
              </Box>
              <Box sx={{ my: 2, display: 'flex', gap: 2 }}>
                <TextField label="Chunk Size" type="number" value={ragChunkSize} onChange={e => setRagChunkSize(Number(e.target.value))} sx={{ width: 120 }} />
                <TextField label="Chunk Overlap" type="number" value={ragChunkOverlap} onChange={e => setRagChunkOverlap(Number(e.target.value))} sx={{ width: 120 }} />
                <Button variant="outlined" onClick={handleRagEmbed} disabled={ragLoading || !ragFilePath}>Chunk & Index</Button>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ my: 2, display: 'flex', gap: 2 }}>
                <TextField label="Ask a question..." fullWidth value={ragQuery} onChange={e => setRagQuery(e.target.value)} disabled={ragLoading} />
                <Button variant="contained" onClick={handleRagQuery} disabled={ragLoading || !ragFilePath}>Ask</Button>
              </Box>
              {ragLoading && <Typography variant="body2" color="text.secondary">Processing...</Typography>}
              {ragError && <Typography variant="body2" color="error">{ragError}</Typography>}
              <Paper sx={{ p: 2, minHeight: 120, bgcolor: 'background.paper', mt: 2 }}>
                {ragResults ? (
                  ragResults.info ? <Typography>{ragResults.info}</Typography> :
                  (ragResults.documents && ragResults.documents.length > 0 ? (
                    <Box>
                      <Typography variant="subtitle2">Top Results:</Typography>
                      {ragResults.documents[0].map((doc, i) => (
                        <Box key={i} sx={{ mb: 1 }}>
                          <Typography variant="body2">{doc}</Typography>
                          <Divider sx={{ my: 1 }} />
                        </Box>
                      ))}
                    </Box>
                  ) : <Typography>No results.</Typography>)
                ) : <Typography variant="body2" color="text.secondary">Results will appear here.</Typography>}
              </Paper>
            </TabPanel>
            <TabPanel value={tab} index={8}>
              <Typography variant="h6">Multi-User Debate</Typography>
              {!debateChatId ? (
                <Box sx={{ my: 2 }}>
                  <Typography variant="subtitle1">Select Teams users and LLMs to join the debate:</Typography>
                  <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2">Teams Users</Typography>
                      <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #eee', borderRadius: 2, p: 1, bgcolor: 'grey.50' }}>
                        {debateAllUsers.map(u => (
                          <Box key={u.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Avatar sx={{ width: 32, height: 32 }}>{u.displayName?.[0] || '?'}</Avatar>
                            <Typography sx={{ flex: 1 }}>{u.displayName || u.mail || u.id}</Typography>
                            <Button size="small" variant="outlined" onClick={() => handleAddUser(u)} disabled={!!debateUsers.find(x => x.id === u.id)}>Add</Button>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2">LLMs</Typography>
                      <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #eee', borderRadius: 2, p: 1, bgcolor: 'grey.50' }}>
                        {llmOptions.map(l => (
                          <Box key={l.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>{l.name[0]}</Avatar>
                            <Typography sx={{ flex: 1 }}>{l.name}</Typography>
                            <Button size="small" variant="outlined" onClick={() => handleAddLLM(l)} disabled={!!debateLLMs.find(x => x.id === l.id)}>Add</Button>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ mt: 2 }}>Participants:</Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', my: 1 }}>
                    {debateUsers.map(u => (
                      <Box key={u.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'grey.100', borderRadius: 2, px: 2, py: 1, mb: 1 }}>
                        <Avatar sx={{ width: 28, height: 28 }}>{u.name[0]}</Avatar>
                        <Typography>{u.name}</Typography>
                        <Button size="small" onClick={() => handleRemoveUser(u.id)}>Remove</Button>
                      </Box>
                    ))}
                    {debateLLMs.map(l => (
                      <Box key={l.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'primary.light', borderRadius: 2, px: 2, py: 1, mb: 1 }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main' }}>{l.name[0]}</Avatar>
                        <Typography>{l.name}</Typography>
                        <Button size="small" onClick={() => handleRemoveLLM(l.id)}>Remove</Button>
                      </Box>
                    ))}
                  </Box>
                  {debateError && <Typography color="error">{debateError}</Typography>}
                  <Button variant="contained" sx={{ mt: 2 }} onClick={handleStartDebate} disabled={debateLoading || (!debateUsers.length && !debateLLMs.length)}>Start Debate</Button>
                </Box>
              ) : (
                <MultiUserDebateChatWindow participants={[...debateUsers, ...debateLLMs]} chatId={debateChatId} />
              )}
            </TabPanel>
            {/* File preview panel */}
            {selectedFile && (
              <Paper sx={{ mt: 2, p: 2, borderRadius: 3, boxShadow: 2 }}>
                <Typography variant="subtitle1">{t('file_preview')}</Typography>
                <FileViewer filePath={selectedFile} />
              </Paper>
            )}
          </Box>
          {/* Right sidebar: Metadata panel */}
          <Drawer
            variant={isMobile ? 'temporary' : 'persistent'}
            anchor="right"
            open={rightOpen}
            onClose={() => setRightOpen(false)}
            sx={{
              width: 340,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: 340,
                boxSizing: 'border-box',
                bgcolor: 'background.paper',
                borderRadius: '16px 0 0 16px',
                boxShadow: 4,
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>{t('metadata')}</Typography>
              <IconButton onClick={() => setRightOpen(false)}><ChevronRightIcon /></IconButton>
            </Box>
            <Divider />
            <Box sx={{ p: 1 }}>
              {selectedFile ? (
                <MetadataPanel filePath={selectedFile} />
              ) : (
                <Typography color="text.secondary">{t('select_file_to_view_metadata')}</Typography>
              )}
            </Box>
          </Drawer>
        </Box>
      </Box>
    </Box>
  );
} 