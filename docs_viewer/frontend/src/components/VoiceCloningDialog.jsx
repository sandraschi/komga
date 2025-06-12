import React, { useState, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, TextField, IconButton, LinearProgress, Stack } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useLanguage } from '../context/LanguageContext';

// Placeholder for backend integration
async function uploadVoiceSample(file, name) {
  // TODO: Send file and name to backend/YourTTS REST API for cloning
  // Return { success: true, voiceId: 'custom-voice-xyz' }
  return new Promise(resolve => setTimeout(() => resolve({ success: true, voiceId: name }), 2000));
}
async function previewClonedVoice(voiceId, text) {
  // TODO: Call backend/YourTTS REST API to synthesize text with the cloned voice
  // Return audio URL
  return new Promise(resolve => setTimeout(() => resolve(null), 1000));
}

export default function VoiceCloningDialog({ open, onClose, onVoiceCloned, assignVoice }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0); // 0: upload/record, 1: name, 2: cloning, 3: preview
  const [file, setFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [voiceName, setVoiceName] = useState('');
  const [cloning, setCloning] = useState(false);
  const [voiceId, setVoiceId] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [assignTo, setAssignTo] = useState('');
  const audioRef = useRef();

  // Handle file upload
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setAudioUrl(URL.createObjectURL(f));
      setStep(1);
    }
  };

  // Handle recording
  const handleRecord = async () => {
    if (recording) {
      mediaRecorder.stop();
      setRecording(false);
      return;
    }
    if (!navigator.mediaDevices) return alert('No microphone available');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new window.MediaRecorder(stream);
    setMediaRecorder(mr);
    let chunks = [];
    mr.ondataavailable = e => chunks.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/wav' });
      setFile(blob);
      setAudioUrl(URL.createObjectURL(blob));
      setStep(1);
    };
    mr.start();
    setRecording(true);
  };

  // Handle voice cloning
  const handleClone = async () => {
    setCloning(true);
    const res = await uploadVoiceSample(file, voiceName);
    setCloning(false);
    if (res.success) {
      setVoiceId(res.voiceId);
      setStep(3);
    } else {
      alert('Voice cloning failed');
    }
  };

  // Handle preview
  const handlePreview = async () => {
    setPreviewing(true);
    const url = await previewClonedVoice(voiceId, 'This is a test of my cloned voice!');
    setPreviewing(false);
    if (url) {
      setPreviewUrl(url);
      audioRef.current && audioRef.current.play();
    } else {
      alert('Preview not available');
    }
  };

  // Handle assign
  const handleAssign = () => {
    if (onVoiceCloned) onVoiceCloned(voiceId, voiceName, assignTo);
    if (onClose) onClose();
  };

  // Reset dialog state on close
  const handleClose = () => {
    setStep(0); setFile(null); setAudioUrl(''); setVoiceName(''); setCloning(false); setVoiceId(''); setPreviewUrl(''); setAssignTo('');
    if (onClose) onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('clone_a_voice')}</DialogTitle>
      <DialogContent>
        {step === 0 && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Button component="label" variant="contained" startIcon={<UploadFileIcon />} sx={{ mb: 2 }}>
              {t('upload_sample')}
              <input type="file" accept="audio/*" hidden onChange={handleFileChange} />
            </Button>
            <Typography variant="body2" sx={{ mb: 2 }}>{t('or')}</Typography>
            <Button variant={recording ? 'contained' : 'outlined'} color={recording ? 'error' : 'primary'} startIcon={recording ? <StopIcon /> : <MicIcon />} onClick={handleRecord}>
              {recording ? t('stop_recording') : t('record_sample')}
            </Button>
          </Box>
        )}
        {step === 1 && (
          <Box>
            <Typography variant="subtitle2">{t('sample_preview')}:</Typography>
            <audio src={audioUrl} controls style={{ width: '100%' }} />
            <TextField label={t('voice_name')} value={voiceName} onChange={e => setVoiceName(e.target.value)} fullWidth sx={{ mt: 2 }} />
            <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={handleClone} disabled={!voiceName || cloning}>
              {cloning ? <LinearProgress sx={{ width: '100%' }} /> : t('clone_voice')}
            </Button>
          </Box>
        )}
        {step === 3 && (
          <Box>
            <Typography variant="subtitle2">{t('cloned_voice')}: {voiceName}</Typography>
            <Button variant="outlined" onClick={handlePreview} disabled={previewing} startIcon={<PlayArrowIcon />} sx={{ mt: 1 }}>
              {t('preview_voice')}
            </Button>
            {previewUrl && <audio src={previewUrl} controls ref={audioRef} style={{ width: '100%', marginTop: 8 }} />}
            <Typography variant="body2" sx={{ mt: 2 }}>{t('assign_voice_to')}:</Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <Button variant={assignTo === 'A' ? 'contained' : 'outlined'} onClick={() => setAssignTo('A')}>{t('llm_a')}</Button>
              <Button variant={assignTo === 'B' ? 'contained' : 'outlined'} onClick={() => setAssignTo('B')}>{t('llm_b')}</Button>
            </Stack>
            <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={handleAssign} disabled={!assignTo}>
              {t('assign_and_finish')}
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('cancel')}</Button>
      </DialogActions>
    </Dialog>
  );
} 