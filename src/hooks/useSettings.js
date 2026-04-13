// src/hooks/useSettings.js
import { useState, useEffect } from 'react';
import { getApiKey, saveApiKey } from '../utils/db';

export function useSettings() {
  const [apiKey,  setApiKeyState] = useState('');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    getApiKey().then((key) => {
      setApiKeyState(key);
      setLoading(false);
    });
  }, []);

  const saveKey = async (key) => {
    await saveApiKey(key);
    setApiKeyState(key.trim());
  };

  const clearKey = async () => {
    await saveApiKey('');
    setApiKeyState('');
  };

  return { apiKey, saveKey, clearKey, loading };
}
