// src/components/LicenseScreen.jsx
import { useState } from 'react';

const PAYMENT_LINK = 'https://buy.stripe.com/aFa3cx5CK4TC8yvaZD5J601';

const COLORS = {
  bg:           '#F7F5F0',
  card:         '#FFFFFF',
  primary:      '#4A7C59',
  primaryLight: '#E8F0E9',
  text:         '#2C2C2C',
  textLight:    '#888888',
  border:       '#E5E0D8',
  red:          '#E05C5C',
};

// 入力値を XXXX-XXXX-XXXX-XXXX 形式に整形
function formatKey(raw) {
  const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16);
  return clean.match(/.{1,4}/g)?.join('-') ?? '';
}

export function LicenseScreen({ onActivate }) {
  const [input,   setInput]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setInput(formatKey(e.target.value));
    setError('');
  };

  const isComplete = input.replace(/-/g, '').length === 16;

  const handleSubmit = async () => {
    if (!isComplete) {
      setError('キーは16文字（XXXX-XXXX-XXXX-XXXX形式）で入力してください');
      return;
    }
    setLoading(true);
    setError('');
    const result = await onActivate(input);
    if (!result.ok) {
      setError(result.message ?? '無効なキーです。もう一度確認してください');
    }
    setLoading(false);
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: COLORS.bg, padding: '32px 24px',
      boxSizing: 'border-box',
      fontFamily: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif",
    }}>

      {/* アイコン + タイトル */}
      <div style={{ fontSize: 64, marginBottom: 12 }}>🌱</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>
        自給菜園ノート
      </div>
      <div style={{ fontSize: 16, color: COLORS.textLight, marginBottom: 40, textAlign: 'center', lineHeight: 1.6 }}>
        ご利用にはライセンスキーが必要です
      </div>

      {/* 入力エリア */}
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>
          ライセンスキー
        </div>
        <input
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          value={input}
          onChange={handleChange}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          style={{
            width: '100%', padding: '14px 16px',
            fontSize: 20, letterSpacing: 3, textAlign: 'center',
            border: `2px solid ${error ? COLORS.red : COLORS.border}`,
            borderRadius: 12, background: COLORS.card, color: COLORS.text,
            outline: 'none', boxSizing: 'border-box',
            fontFamily: 'monospace',
          }}
        />
        {error && (
          <div style={{ fontSize: 14, color: COLORS.red, marginTop: 6, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !isComplete}
          style={{
            width: '100%', marginTop: 16,
            padding: '16px', fontSize: 18, fontWeight: 700,
            background: loading || !isComplete ? COLORS.border : COLORS.primary,
            color: '#fff', border: 'none', borderRadius: 12,
            cursor: loading || !isComplete ? 'default' : 'pointer',
            minHeight: 56,
            transition: 'background 0.2s',
          }}
        >
          {loading ? '確認中...' : '確認する'}
        </button>
      </div>

      {/* 区切り */}
      <div style={{
        width: '100%', maxWidth: 360,
        borderTop: `1px solid ${COLORS.border}`,
        margin: '36px 0 28px',
      }} />

      {/* キー取得リンク */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, color: COLORS.textLight, marginBottom: 12 }}>
          キーをお持ちでない方
        </div>
        <a
          href={PAYMENT_LINK}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-block',
            padding: '14px 28px', fontSize: 17, fontWeight: 600,
            color: COLORS.primary,
            border: `2px solid ${COLORS.primary}`,
            borderRadius: 12, textDecoration: 'none',
            background: COLORS.primaryLight,
          }}
        >
          無料でキーを取得する 🌱
        </a>
        <div style={{ fontSize: 14, color: COLORS.textLight, marginTop: 10 }}>
          メールアドレス登録後、キーが届きます
        </div>
      </div>
    </div>
  );
}
