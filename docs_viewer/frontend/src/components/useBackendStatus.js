import { useState, useEffect, useCallback } from 'react';

export default function useBackendStatus({ interval = 10000 } = {}) {
  const [status, setStatus] = useState('unknown'); // 'ok', 'down', 'unknown'
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(Date.now());
  const [details, setDetails] = useState(null);

  const checkBackend = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/ping');
      if (res.ok) {
        const data = await res.json();
        setDetails(data.details);
        if (data.status === 'ok') {
          setStatus('ok');
          setError(null);
        } else {
          setStatus('down');
          // Compose a detailed error message
          let msg = 'Backend health check failed:';
          if (data.details) {
            if (data.details.node_modules !== 'ok') msg += ` node_modules: ${data.details.node_modules}.`;
            if (data.details.db !== 'ok') msg += ` db: ${data.details.db}.`;
            if (data.details.llm) {
              Object.entries(data.details.llm).forEach(([llm, info]) => {
                if (!info.reachable) msg += ` ${llm} not reachable.`;
                else if (!info.hasLoadedModel) msg += ` ${llm} has no loaded models.`;
              });
            }
          }
          setError(msg);
        }
      } else {
        setStatus('down');
        setError('Backend responded with error');
        setDetails(null);
      }
    } catch (e) {
      setStatus('down');
      setError('Backend not reachable');
      setDetails(null);
    }
    setLastChecked(Date.now());
  }, []);

  useEffect(() => {
    checkBackend();
    if (status !== 'ok') {
      const timer = setInterval(checkBackend, interval);
      return () => clearInterval(timer);
    }
  }, [checkBackend, status, interval]);

  return {
    status,
    error,
    lastChecked,
    details,
    retry: checkBackend,
  };
} 