// Never use console directly. All logs are sent to the backend.
const sendLog = (level, ...args) => {
  fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level, message: args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ') })
  }).catch(() => {/* Optionally buffer or drop logs if backend is unreachable */});
};

const logger = {
  info: (...args) => sendLog('info', ...args),
  error: (...args) => sendLog('error', ...args),
  warn: (...args) => sendLog('warn', ...args),
};

export default logger; 