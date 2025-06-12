// const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
// const url = require('url');
const minimist = require('minimist');
const express = require('express');
const fs = require('fs');
const axios = require('axios');
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`)
  ),
  transports: [
    new winston.transports.File({ filename: 'main.log' }),
    new winston.transports.Console()
  ]
});
const net = require('net');
const { spawn } = require('child_process');

// Comment out the LOG_FILE definition since it is not used
// const LOG_FILE = path.join(__dirname, 'main.log');

// Comment out all unused variables and error variables flagged by ESLint
// function logToFile(level, ...args) {
//   const msg = `[${new Date().toISOString()}] [${level}] ` + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a, null, 2))).join(' ');
//   fs.appendFileSync(LOG_FILE, msg + '\n');
//   if (level === 'error') {
//     console.error(msg);
//   } else if (level === 'warn') {
//     console.warn(msg);
//   } else {
//     console.log(msg);
//   }
// }

// Parse command-line arguments
const argv = minimist(process.argv.slice(1));

if (argv.h || argv.help) {
  logger.info(`DocsViewer - Documentation Viewer\n\nUsage:\n  DocsViewer.exe [--docs <folder>] [--provider <provider>] [--model <model>]\n\nOptions:\n  --docs <folder>      Set the initial docs folder\n  --provider <name>    Set the LLM provider (ollama, lmstudio, vllm)\n  --model <name>       Set the LLM model (e.g., llama2, mistral)\n  -h, --help           Show this help message\n\nBuilt-in docs:\n  README.md, GettingStarted.md, Features.md, LLM.md, Providers.md, RAG.md\n`);
  console.log(`DocsViewer - Documentation Viewer\n\nUsage:\n  DocsViewer.exe [--docs <folder>] [--provider <provider>] [--model <model>]\n\nOptions:\n  --docs <folder>      Set the initial docs folder\n  --provider <name>    Set the LLM provider (ollama, lmstudio, vllm)\n  --model <name>       Set the LLM model (e.g., llama2, mistral)\n  -h, --help           Show this help message\n\nBuilt-in docs:\n  README.md, GettingStarted.md, Features.md, LLM.md, Providers.md, RAG.md\n`);
  process.exit(0);
}

// Determine docs folder or use virtual preset
let docsRoot = argv.docs ? path.resolve(argv.docs) : null;
const useVirtualDocs = !docsRoot;

// Error handling for docsRoot
if (docsRoot && (!fs.existsSync(docsRoot) || !fs.statSync(docsRoot).isDirectory())) {
  logger.error(`[ERROR] Docs folder does not exist or is not accessible: ${docsRoot}`);
  process.exit(1);
}

// LLM config
let llmProvider = argv.provider || 'ollama';
let llmModel = argv.model || 'llama2';

// --- Express Backend Setup (in-process) ---
const backend = express();
const PORT = 5174;

// --- Port Conflict Handling (Cross-platform) ---
const isWin = process.platform === 'win32';
const checkAndKillPort = async (port) => {
  const { execSync } = require('child_process');
  try {
    if (isWin) {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const lines = output.split('\n').filter(Boolean);
      let killed = false;
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== process.pid.toString()) {
          try {
            execSync(`taskkill /PID ${pid} /F`);
            logger.info(`[INFO] Killed process ${pid} using port ${port}`);
            killed = true;
          } catch (e) {
            logger.error(e);
          }
        }
      }
      return killed;
    } else {
      const output = execSync(`lsof -i :${port} -t`, { encoding: 'utf8' });
      const pids = output.split('\n').filter(Boolean);
      let killed = false;
      for (const pid of pids) {
        if (pid && pid !== process.pid.toString()) {
          try {
            execSync(`kill -9 ${pid}`);
            logger.info(`[INFO] Killed process ${pid} using port ${port}`);
            killed = true;
          } catch (e) {
            logger.error(e);
          }
        }
      }
      return killed;
    }
  } catch (e) {
    logger.error(e);
    return false;
  }
};

const isPortFree = (port) => {
  const { execSync } = require('child_process');
  try {
    if (isWin) {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      return output.trim().length === 0;
    } else {
      const output = execSync(`lsof -i :${port} -t`, { encoding: 'utf8' });
      return output.trim().length === 0;
    }
  } catch (e) {
    logger.error(e);
    return true;
  }
};

(async () => {
  try {
    await checkAndKillPort(PORT);
    // Wait a moment for port to free
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (!isPortFree(PORT)) {
      logger.error(`[FATAL] Port ${PORT} is still in use after attempting to kill processes. Please free the port and try again.`);
      process.exit(1);
    }
    backend.listen(PORT, () => {
      logger.info(`docs_viewer backend running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Error starting server: ' + (err.stack || err.message));
    logger.error('[FATAL] Could not start backend:', err.message);
    process.exit(1);
  }
})();

backend.use(require('cors')());
backend.use(express.json());

// Serve frontend static files
const frontendDist = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  backend.use(express.static(frontendDist));
  backend.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Built-in docs (prose-rich)
const virtualTree = [
  {
    type: 'file',
    name: 'README.md',
    path: 'README.md',
    content: `# Welcome to DocsViewer\n\nDocsViewer is a modern, extensible documentation viewer for Markdown, PDF, DOCX, and TXT files.\n\n- Use the file tree to browse docs.\n- Use --docs <folder> to open your own folder.\n- Use --provider and --model to set the LLM backend.\n- Built-in docs: LLM, Providers, RAG.\n`
  },
  {
    type: 'file',
    name: 'GettingStarted.md',
    path: 'GettingStarted.md',
    content: `# Getting Started\n\n1. Click a file to view it.\n2. Use tags, comments, and search.\n3. Try the built-in LLM endpoints for AI-powered features.\n`
  },
  {
    type: 'file',
    name: 'Features.md',
    path: 'Features.md',
    content: `# Features\n\n- Three-column layout: tree, viewer, metadata\n- Markdown, PDF, DOCX, TXT\n- Tagging, starring, comments, filtering, search\n- Light/dark mode\n- LLM integration (Ollama, LM Studio, vLLM)\n- RAG-ready architecture\n- One-click and single-exe support\n`
  },
  {
    type: 'file',
    name: 'LLM.md',
    path: 'LLM.md',
    content: `# Large Language Models (LLMs)\n\nDocsViewer supports integration with local LLMs for AI-powered features.\n\n## What is an LLM?\nA Large Language Model is an AI system trained to understand and generate human language.\n\n## Supported Providers\n- **Ollama**: Fast, local inference for many open models.\n- **LM Studio**: Desktop LLM runner with API.\n- **vLLM**: High-performance inference server.\n\n## How to Use\n- Use --provider and --model to select the backend and model.\n- Try the /api/llm/ask endpoint to send prompts.\n\n## Example\n\nPOST /api/llm/ask\n{ "prompt": "Summarize this document." }\n\n## Future\n- More providers\n- RAG (Retrieval-Augmented Generation)\n- In-app chat and summarization\n`
  },
  {
    type: 'file',
    name: 'Providers.md',
    path: 'Providers.md',
    content: `# LLM Providers\n\n## Ollama\n- Local, fast, supports many models\n- API: http://localhost:11434\n\n## LM Studio\n- Desktop app, easy to use\n- API: http://localhost:1234\n\n## vLLM\n- High-performance, scalable\n- API: http://localhost:8000\n\n## How to Configure\n- Use --provider and --model at launch\n- Or set via /api/llm/config\n`
  },
  {
    type: 'file',
    name: 'RAG.md',
    path: 'RAG.md',
    content: `# Retrieval-Augmented Generation (RAG)\n\nRAG combines LLMs with document retrieval for powerful, context-aware answers.\n\n## What is RAG?\n- The LLM retrieves relevant docs, then generates a response using both the prompt and the docs.\n\n## Future in DocsViewer\n- Planned: RAG-powered search, summarization, and Q&A\n- Will support ChromaDB and other vector stores\n- Stay tuned!\n`
  }
];

// Helper: Recursively get file tree (always include children for folders)
function getFileTree(dir, base = dir) {
  let results = [];
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (e) {
    logger.error(e);
  }
  for (const file of files) {
    const filePath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch (e) {
      logger.error(e);
    }
    const relPath = path.relative(base, filePath);
    if (stat && stat.isDirectory()) {
      results.push({
        type: 'folder',
        name: file,
        path: relPath,
        children: getFileTree(filePath, base) // always present
      });
    } else {
      results.push({
        type: 'file',
        name: file,
        path: relPath
      });
    }
  }
  return results;
}

// API: Get file tree
backend.get('/api/tree', (req, res) => {
  try {
    if (useVirtualDocs) {
      res.json(virtualTree.map(({ type, name, path }) => ({ type, name, path, children: type === 'folder' ? [] : undefined })));
    } else {
      const root = req.query.root ? path.resolve(req.query.root) : docsRoot;
      const tree = getFileTree(root);
      res.json(tree);
    }
  } catch (err) {
    logger.error(`[API] /api/tree error: ${err.message}`);
    res.status(500).json({ error: 'Failed to read file tree: ' + err.message });
  }
});

// API: Get file content
backend.get('/api/file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'Missing file path' });
  if (useVirtualDocs) {
    const file = virtualTree.find(f => f.path === filePath);
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.type('text/plain').send(file.content);
  } else {
    const absPath = path.resolve(docsRoot, filePath);
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'File not found' });
    fs.createReadStream(absPath).pipe(res);
  }
});

// --- LLM API Endpoints (real integration) ---
const PROVIDERS = ['ollama', 'lmstudio', 'vllm'];
// const MODELS = {
//   ollama: ['llama2', 'mistral', 'phi3'],
//   lmstudio: ['llama2', 'mistral'],
//   vllm: ['llama2', 'mistral', 'mixtral']
// };
const PROVIDER_URLS = {
  ollama: process.env.OLLAMA_URL || 'http://localhost:11434',
  lmstudio: process.env.LMSTUDIO_URL || 'http://localhost:1234',
  vllm: process.env.VLLM_URL || 'http://localhost:8000'
};

backend.get('/api/llm/providers', async (req, res) => {
  const results = await Promise.all(PROVIDERS.map(async (provider) => {
    const url = PROVIDER_URLS[provider];
    let running = false;
    let models = [];
    let error = null;
    logger.info(`[LLM] Checking provider: ${provider} at ${url}`);
    try {
      if (provider === 'ollama') {
        const ping = await axios.get(`${url}/api/tags`, { timeout: 2000 });
        logger.info(`[LLM] Ollama response:`, ping.data);
        if (ping.data && Array.isArray(ping.data.models)) {
          running = true;
          models = ping.data.models.map((m) => m.name);
        } else {
          error = 'Unexpected response format from Ollama';
          logger.error(`[LLM] Ollama error: ${error}`);
        }
      } else if (provider === 'lmstudio') {
        const ping = await axios.get(`${url}/api/v0/models`, { timeout: 2000 });
        logger.info(`[LLM] LM Studio response:`, ping.data);
        if (ping.data && Array.isArray(ping.data.data)) {
          running = true;
          models = ping.data.data.filter((m) => m.state === 'loaded').map((m) => m.id);
        } else {
          error = 'Unexpected response format from LM Studio';
          logger.error(`[LLM] LM Studio error: ${error}`);
        }
      } else if (provider === 'vllm') {
        try {
          const ping = await axios.get(`${url}/v1/models`, { timeout: 2000 });
          logger.info(`[LLM] vLLM response:`, ping.data);
          if (ping.data && Array.isArray(ping.data.data)) {
            running = true;
            models = ping.data.data.map((m) => m.id);
          } else {
            error = 'Unexpected response format from vLLM';
            logger.error(`[LLM] vLLM error: ${error}`);
          }
        } catch (e) {
          logger.error(e);
        }
      }
    } catch (e) {
      logger.error(e);
    }
    return { provider, url, running, models, error };
  }));
  res.json(results);
});

backend.get('/api/llm/models', async (req, res) => {
  const provider = req.query.provider || llmProvider;
  try {
    let models = [];
    if (provider === 'ollama') {
      const result = await axios.get(`${PROVIDER_URLS.ollama}/api/tags`);
      models = result.data.models || [];
    } else if (provider === 'lmstudio') {
      const result = await axios.get(`${PROVIDER_URLS.lmstudio}/v1/models`);
      // LM Studio returns { data: [ { id, ... }, ... ] }
      models = result.data.data || [];
    } else if (provider === 'vllm') {
      const result = await axios.get(`${PROVIDER_URLS.vllm}/v1/models`);
      models = result.data.models || [];
    } else {
      return res.status(400).json({ error: 'Unknown provider' });
    }
    res.json({ provider, models });
  } catch (e) {
    logger.error(e);
  }
});

backend.post('/api/llm/ask', async (req, res) => {
  const { prompt, provider, model, messages } = req.body;
  const useProvider = provider || llmProvider;
  const useModel = model || llmModel;
  try {
    let responseText = '';
    if (useProvider === 'ollama') {
      // Ollama: supports both prompt and messages (as context)
      const payload = { model: useModel, stream: false };
      if (messages && Array.isArray(messages)) {
        // Concatenate messages for context
        payload.prompt = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n') + `\nUser: ${prompt}`;
      } else {
        payload.prompt = prompt;
      }
      const result = await axios.post(
        `${PROVIDER_URLS.ollama}/api/generate`,
        payload,
        { timeout: 60000 }
      );
      responseText = result.data.response || result.data.message || JSON.stringify(result.data);
    } else if (useProvider === 'lmstudio' || useProvider === 'vllm') {
      // Both support OpenAI-style chat
      const apiUrl = useProvider === 'lmstudio' ? PROVIDER_URLS.lmstudio : PROVIDER_URLS.vllm;
      const payload = {
        model: useModel,
        messages: messages && Array.isArray(messages)
          ? messages.concat([{ role: 'user', content: prompt }])
          : [{ role: 'user', content: prompt }],
        stream: false
      };
      const result = await axios.post(
        `${apiUrl}/v1/chat/completions`,
        payload,
        { timeout: 60000 }
      );
      responseText = result.data.choices?.[0]?.message?.content || JSON.stringify(result.data);
    } else {
      return res.status(400).json({ error: 'Unknown provider' });
    }
    res.json({ provider: useProvider, model: useModel, prompt, response: responseText });
  } catch (e) {
    logger.error(e);
  }
});

backend.get('/api/llm/config', (req, res) => {
  res.json({ provider: llmProvider, model: llmModel });
});

backend.post('/api/llm/config', (req, res) => {
  const { provider, model } = req.body;
  if (provider && PROVIDERS.includes(provider)) llmProvider = provider;
  if (model) llmModel = model;
  res.json({ provider: llmProvider, model: llmModel });
});

backend.post('/api/llm/refine', async (req, res) => {
  const { prompt, provider, model, creativity, length, detail, formality } = req.body;
  const useProvider = provider || llmProvider;
  const useModel = model || llmModel;
  // Build meta-prompt
  const metaPrompt =
    `Rewrite the following prompt to be ${length || 'medium length'}, ${detail || 'detailed'}, ${formality || 'neutral'}, and ${creativity || 'balanced'} for an AI assistant.\n` +
    `Creativity: ${creativity || 'balanced'}.\n` +
    `Length: ${length || 'medium'}.\n` +
    `Detail: ${detail || 'detailed'}.\n` +
    `Formality: ${formality || 'neutral'}.\n` +
    `\nOriginal prompt: "${prompt}"`;
  // Map creativity to temperature
  let temperature = 0.7;
  if (creativity === 'demure') temperature = 0.1;
  else if (creativity === 'balanced') temperature = 0.7;
  else if (creativity === 'insane') temperature = 1.5;
  try {
    let responseText = '';
    if (useProvider === 'ollama') {
      const result = await axios.post(
        `${PROVIDER_URLS.ollama}/api/generate`,
        { model: useModel, prompt: metaPrompt, stream: false, options: { temperature } },
        { timeout: 60000 }
      );
      responseText = result.data.response || result.data.message || JSON.stringify(result.data);
    } else if (useProvider === 'lmstudio' || useProvider === 'vllm') {
      const apiUrl = useProvider === 'lmstudio' ? PROVIDER_URLS.lmstudio : PROVIDER_URLS.vllm;
      const result = await axios.post(
        `${apiUrl}/v1/chat/completions`,
        {
          model: useModel,
          messages: [{ role: 'user', content: metaPrompt }],
          stream: false,
          temperature
        },
        { timeout: 60000 }
      );
      responseText = result.data.choices?.[0]?.message?.content || JSON.stringify(result.data);
    } else {
      return res.status(400).json({ error: 'Unknown provider' });
    }
    res.json({ refined: responseText });
  } catch (e) {
    logger.error(e);
  }
});

// (Other API endpoints can be added as needed)

// Global Express error handler
backend.use((err, req, res, next) => {
  logger.error(`[EXPRESS] Unhandled error: ${err.stack || err.message}`);
  res.status(500).json({ error: 'Internal server error: ' + (err.message || 'Unknown error') });
});

// Process-level error logging
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception: ' + (err.stack || err.message));
  logger.error('[FATAL] Uncaught Exception:', err.stack || err.message);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection: ' + (reason && reason.stack ? reason.stack : reason));
  logger.error('[FATAL] Unhandled Rejection:', reason && reason.stack ? reason.stack : reason);
  process.exit(1);
});

// If main.js is run directly, check if backend is running; if not, start it
if (require.main === module) {
  const port = 5174;
  const client = new net.Socket();
  client.once('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      logger.info('Backend not running, starting backend/index.js...');
      const backendProc = spawn('node', [path.join(__dirname, 'backend', 'index.js')], {
        stdio: ['ignore', fs.openSync(path.join(__dirname, 'main.log'), 'a'), fs.openSync(path.join(__dirname, 'main.log'), 'a')],
        detached: true
      });
      backendProc.unref();
    }
  });
  client.once('connect', () => {
    logger.info('Backend already running on port ' + port);
    client.end();
  });
  client.connect(port, '127.0.0.1');
}

// Start backend server
backend.listen(PORT, () => {
  logger.info(`DocsViewer backend running on port ${PORT}`);
}); 