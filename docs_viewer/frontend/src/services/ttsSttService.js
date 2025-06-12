// Enhanced TTS/STT service for all AI miniprojects
// Supports Coqui TTS (with SSML/emotion), Piper, browser APIs, and backend proxy endpoints
// Usage:
//   await ttsSttService.speak('Hello world', 'en', {voice: 'en-A', ssml: true});
//   ttsSttService.stopSpeak();
//   ttsSttService.listen('en', (text) => { ... });
//   ttsSttService.stopListen();
//   await ttsSttService.detectEngines();

const COQUI_URL = 'http://localhost:5000/api/tts'; // Coqui TTS REST API
const PIPER_URL = 'http://localhost:5002/api/tts'; // Piper REST API
const WHISPER_URL = 'http://localhost:5003/api/stt'; // Whisper REST API
const BACKEND_TTS_URL = '/api/tts'; // Backend proxy endpoint
const BACKEND_STT_URL = '/api/stt'; // Backend proxy endpoint

const ttsSttService = {
  engines: {
    coqui: false,
    piper: false,
    browser: false,
    backend: false,
  },
  voices: [],

  /**
   * Detect available TTS engines and voices
   */
  async detectEngines() {
    // Coqui
    try {
      const res = await fetch(COQUI_URL, { method: 'OPTIONS' });
      this.engines.coqui = res.ok;
    } catch { this.engines.coqui = false; }
    // Piper
    try {
      const res = await fetch(PIPER_URL, { method: 'OPTIONS' });
      this.engines.piper = res.ok;
    } catch { this.engines.piper = false; }
    // Backend
    try {
      const res = await fetch(BACKEND_TTS_URL, { method: 'OPTIONS' });
      this.engines.backend = res.ok;
    } catch { this.engines.backend = false; }
    // Browser
    this.engines.browser = 'speechSynthesis' in window;
    // Voices
    if (this.engines.browser) {
      this.voices = window.speechSynthesis.getVoices();
    }
    return this.engines;
  },

  /**
   * Speak text (optionally SSML) with selected voice and engine
   * @param {string} text - Text or SSML to speak
   * @param {string} lang - Language or voice code
   * @param {object} opts - {voice, ssml, emotion, engine}
   */
  async speak(text, lang = 'en', opts = {}) {
    const { voice = lang, ssml = false, emotion = null, engine = null } = opts;
    let spoken = false;
    // Try Coqui TTS (SSML/emotion)
    if ((engine === 'coqui' || !engine) && this.engines.coqui) {
      try {
        const payload = { text, voice, ssml: ssml || /<.*?>/.test(text) };
        if (emotion) payload.emotion = emotion;
        const res = await fetch(COQUI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.play();
          this._audio = audio;
          spoken = true;
        }
      } catch {}
    }
    // Try Piper
    if (!spoken && (engine === 'piper' || !engine) && this.engines.piper) {
      try {
        const res = await fetch(PIPER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice }),
        });
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.play();
          this._audio = audio;
          spoken = true;
        }
      } catch {}
    }
    // Try backend
    if (!spoken && (engine === 'backend' || !engine) && this.engines.backend) {
      try {
        const res = await fetch(BACKEND_TTS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice, ssml, emotion }),
        });
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.play();
          this._audio = audio;
          spoken = true;
        }
      } catch {}
    }
    // Fallback: browser SpeechSynthesis
    if (!spoken && this.engines.browser) {
      const utter = new window.SpeechSynthesisUtterance(text);
      utter.lang = lang;
      if (voice && this.voices.length) {
        utter.voice = this.voices.find(v => v.name === voice || v.lang === voice) || null;
      }
      window.speechSynthesis.speak(utter);
      this._utter = utter;
      spoken = true;
    }
    if (!spoken) alert('No TTS engine available.');
  },

  stopSpeak() {
    if (this._audio) {
      this._audio.pause();
      this._audio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  },

  /**
   * Listen for speech and transcribe (STT)
   * @param {string} lang - Language code
   * @param {function} onResult - Callback with transcript
   * @param {object} opts - {engine}
   */
  listen(lang = 'en', onResult, opts = {}) {
    let listening = false;
    let recognition;
    // Try browser
    try {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = lang;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          onResult(transcript);
        };
        recognition.onerror = (event) => {
          onResult('', event.error);
        };
        recognition.start();
        this._recognition = recognition;
        listening = true;
      }
    } catch (e) { /* fallback below */ }
    // TODO: Add UI to record audio and send to Whisper REST API
    // Example: await ttsSttService.sttFromAudio(audioBlob, lang, onResult)
    return listening;
  },
  stopListen() {
    if (this._recognition) {
      this._recognition.stop();
      this._recognition = null;
    }
  },
  /**
   * Send audio blob to Whisper REST API or backend for STT
   * @param {Blob} audioBlob
   * @param {string} lang
   * @param {function} onResult
   */
  async sttFromAudio(audioBlob, lang = 'en', onResult) {
    let transcribed = false;
    // Try Whisper REST
    try {
      const form = new FormData();
      form.append('audio', audioBlob, 'audio.wav');
      form.append('lang', lang);
      const res = await fetch(WHISPER_URL, { method: 'POST', body: form });
      if (res.ok) {
        const data = await res.json();
        onResult(data.text);
        transcribed = true;
      }
    } catch {}
    // Try backend
    if (!transcribed) {
      try {
        const form = new FormData();
        form.append('audio', audioBlob, 'audio.wav');
        form.append('lang', lang);
        const res = await fetch(BACKEND_STT_URL, { method: 'POST', body: form });
        if (res.ok) {
          const data = await res.json();
          onResult(data.text);
          transcribed = true;
        }
      } catch {}
    }
    if (!transcribed) onResult('', 'No STT engine available.');
  },
};

export default ttsSttService; 