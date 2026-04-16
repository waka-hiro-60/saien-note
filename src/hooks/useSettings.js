// src/hooks/useSettings.js
import { useState, useEffect, useCallback } from 'react';
import {
  getApiKey, saveApiKey,
  getLicenseKey, saveLicenseKey,
  getLicenseValidatedAt, saveLicenseValidatedAt,
} from '../utils/db';

const API_BASE = 'https://api.saien.career-life.tech';
const VALIDATE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7日間

export function useSettings() {
  const [apiKey,        setApiKeyState]       = useState('');
  const [licenseKey,    setLicenseKeyState]   = useState('');
  // 'checking' | 'valid' | 'invalid'
  const [licenseStatus, setLicenseStatus]     = useState('checking');
  const [loading,       setLoading]           = useState(true);

  useEffect(() => {
    (async () => {
      const [key, lkey, validatedAt] = await Promise.all([
        getApiKey(),
        getLicenseKey(),
        getLicenseValidatedAt(),
      ]);
      setApiKeyState(key);
      setLicenseKeyState(lkey);

      // ─ 案A：apiKey（管理者キー）があればライセンスチェックをスキップ ─
      // オーナー（Hiroshi）は apiKey を設定済みなので無条件で起動
      if (key) {
        setLicenseStatus('valid');
        setLoading(false);
        return;
      }

      // licenseKey がない → ライセンス画面を表示
      if (!lkey) {
        setLicenseStatus('invalid');
        setLoading(false);
        return;
      }

      // 7日以内に検証済み → キャッシュで起動OK
      const now = Date.now();
      if (now - validatedAt < VALIDATE_INTERVAL_MS) {
        setLicenseStatus('valid');
        setLoading(false);
        return;
      }

      // 7日超 → 再検証（オンライン時のみ）
      if (navigator.onLine) {
        try {
          const res  = await fetch(`${API_BASE}/validate-key`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: lkey }),
          });
          const data = await res.json();
          if (data.valid) {
            await saveLicenseValidatedAt(now);
            setLicenseStatus('valid');
          } else {
            // キーが無効になっていた場合（失効・削除等）
            setLicenseStatus('invalid');
          }
        } catch {
          // ネットワークエラー → キャッシュで起動（寛容な設計）
          setLicenseStatus('valid');
        }
      } else {
        // オフライン → キャッシュで起動
        setLicenseStatus('valid');
      }
      setLoading(false);
    })();
  }, []);

  // apiKey の保存・削除
  const saveKey = async (key) => {
    await saveApiKey(key);
    setApiKeyState(key.trim());
  };

  const clearKey = async () => {
    await saveApiKey('');
    setApiKeyState('');
  };

  // ライセンスキーの有効化（LicenseScreen から呼ぶ）
  // 成功: { ok: true }
  // 失敗: { ok: false, message: string }
  const activateLicense = useCallback(async (rawKey) => {
    const trimmed = rawKey.replace(/\s/g, '').toUpperCase();
    try {
      const res  = await fetch(`${API_BASE}/validate-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: trimmed }),
      });
      const data = await res.json();
      if (data.valid) {
        await saveLicenseKey(trimmed);
        await saveLicenseValidatedAt(Date.now());
        setLicenseKeyState(trimmed);
        setLicenseStatus('valid');
        return { ok: true };
      }
      return { ok: false, message: data.message ?? '無効なキーです。もう一度確認してください' };
    } catch {
      return { ok: false, message: 'ネットワークエラーです。接続を確認してください' };
    }
  }, []);

  return {
    apiKey, saveKey, clearKey,
    licenseKey, licenseStatus, activateLicense,
    loading,
  };
}
