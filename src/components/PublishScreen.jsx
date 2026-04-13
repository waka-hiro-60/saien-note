// src/components/PublishScreen.jsx
import { useState } from 'react';

const COLORS = {
  bg:           '#F7F5F0',
  card:         '#FFFFFF',
  primary:      '#4A7C59',
  primaryLight: '#E8F0E9',
  accent:       '#C8A96E',
  text:         '#2C2C2C',
  textLight:    '#888888',
  border:       '#E5E0D8',
  tagBg:        '#E8F0E9',
  tagText:      '#3A6B47',
};

const API_BASE = 'https://api.saien.career-life.tech';

function stripBase64Prefix(b64) {
  if (!b64) return b64;
  const idx = b64.indexOf(',');
  return idx >= 0 ? b64.slice(idx + 1) : b64;
}

function blobToBase64Bare(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function publishRecord(record, apiKey) {
  const imageBase64s = [];
  if (record.imageBase64) {
    imageBase64s.push(stripBase64Prefix(record.imageBase64));
  } else if (record.imageBase64s && record.imageBase64s.length > 0) {
    for (const b64 of record.imageBase64s) {
      imageBase64s.push(stripBase64Prefix(b64));
    }
  } else {
    const images = record.images ?? (record.imageBlob ? [record.imageBlob] : []);
    for (const blob of images) {
      if (blob instanceof Blob) imageBase64s.push(await blobToBase64Bare(blob));
    }
  }

  const body = {
    id:          record.id,
    category:    record.category ?? 'veggie',
    date:        record.date,
    time:        record.time ?? '',
    comment:     record.comment ?? '',
    text:        record.text ?? '',
    tags:        record.tags ?? [],
    imageBase64s,
  };

  const res = await fetch(`${API_BASE}/publish`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`APIエラー ${res.status}: ${msg}`);
  }
  return res.json();
}

function getCategoryIcon(r) {
  const cat = r.category ?? 'veggie';
  if (cat === 'diary') return '📔';
  if (cat === 'bed')   return '🌱';
  return '🥬';
}

// 記録のサムネイルBase64を返す
function getThumb(r) {
  if (r.imageBase64) return r.imageBase64;
  if (r.imageBase64s && r.imageBase64s.length > 0) return r.imageBase64s[0];
  return null;
}

// 記録の本文（コメントまたは日記テキスト）の冒頭を返す
function getSnippet(r) {
  const src = r.text || r.comment || '';
  return src.length > 30 ? src.slice(0, 30) + '…' : src;
}

export function PublishScreen({ records, apiKey }) {
  const IS_OWNER = !!apiKey;

  const [selected,   setSelected]   = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [progress,   setProgress]   = useState('');
  const [error,      setError]      = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const unpublished = records.records.filter((r) => !r.archived && !r.published);
  const published   = records.records.filter((r) => !r.archived &&  r.published);

  const toggleSelect = (id) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const selectAll = () => setSelected(unpublished.map((r) => r.id));
  const clearAll  = () => setSelected([]);

  const handlePublish = async () => {
    if (!IS_OWNER || selected.length === 0) return;
    setPublishing(true);
    setError(null);
    setSuccessMsg('');
    try {
      const targets = records.records.filter((r) => selected.includes(r.id));
      for (let i = 0; i < targets.length; i++) {
        setProgress(`${i + 1} / ${targets.length} 件を公開中…`);
        await publishRecord(targets[i], apiKey);
      }
      await records.publish(selected);
      setSelected([]);
      setSuccessMsg(`${targets.length}件を公開しました`);
    } catch (e) {
      console.error(e);
      setError(e != null ? (e.message ?? String(e)) : '公開に失敗しました');
    } finally {
      setPublishing(false);
      setProgress('');
    }
  };

  const handleUnpublish = async (id) => {
    try {
      await fetch(`${API_BASE}/record/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      await records.unpublish(id);
    } catch (e) {
      console.error(e);
      setError(e != null ? (e.message ?? String(e)) : '非公開への変更に失敗しました');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ヘッダー */}
      <div style={{
        padding: '14px 16px 10px', background: COLORS.card,
        borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0,
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>公開管理</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {error && (
          <div style={{ padding: 12, borderRadius: 8, background: '#FEE', color: '#C00', fontSize: 16, marginBottom: 12 }}>
            エラー: {error}
          </div>
        )}
        {successMsg && (
          <div style={{ padding: 12, borderRadius: 8, background: COLORS.primaryLight, color: COLORS.primary, fontSize: 16, marginBottom: 12 }}>
            {successMsg}
          </div>
        )}

        {/* 未公開セクション */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 600, color: COLORS.text }}>
              未公開の記録（{unpublished.length}件）
            </span>
            {IS_OWNER && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={selectAll} style={btnStyle}>全選択</button>
                <button onClick={clearAll}  style={btnStyle}>解除</button>
              </div>
            )}
          </div>

          {records.loading ? (
            <div style={{ textAlign: 'center', color: COLORS.textLight, padding: 20, fontSize: 16 }}>読み込み中…</div>
          ) : unpublished.length === 0 ? (
            <div style={{ textAlign: 'center', color: COLORS.textLight, padding: 20, fontSize: 16 }}>
              未公開の記録はありません
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {unpublished.map((r) => {
                const checked  = selected.includes(r.id);
                const thumb    = getThumb(r);
                const snippet  = getSnippet(r);
                const photoCount = r.imageBase64
                  ? 1
                  : (r.imageBase64s ?? []).length;

                return (
                  <div
                    key={r.id}
                    onClick={() => IS_OWNER && toggleSelect(r.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: checked ? COLORS.primaryLight : COLORS.card,
                      border: `1px solid ${checked ? COLORS.primary : COLORS.border}`,
                      borderRadius: 10, overflow: 'hidden',
                      cursor: IS_OWNER ? 'pointer' : 'default',
                      minHeight: 72,
                    }}
                  >
                    {/* サムネイル */}
                    <div style={{
                      width: 72, height: 72, flexShrink: 0,
                      background: '#E5E0D8', position: 'relative',
                    }}>
                      {thumb ? (
                        <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{
                          width: '100%', height: '100%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 28,
                        }}>{getCategoryIcon(r)}</div>
                      )}
                      {photoCount >= 2 && (
                        <div style={{
                          position: 'absolute', bottom: 2, right: 2,
                          background: 'rgba(0,0,0,0.55)', color: '#fff',
                          fontSize: 12, borderRadius: 4, padding: '1px 4px', lineHeight: 1.4,
                        }}>📷{photoCount}</div>
                      )}
                    </div>

                    {/* テキスト */}
                    <div style={{ flex: 1, minWidth: 0, padding: '8px 8px 8px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 16 }}>{getCategoryIcon(r)}</span>
                        <span style={{ fontSize: 15, color: COLORS.textLight }}>
                          {r.date}{r.time ? ` ${r.time}` : ''}
                        </span>
                      </div>
                      {snippet && (
                        <div style={{
                          fontSize: 16, color: COLORS.text, lineHeight: 1.4,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          marginBottom: 4,
                        }}>{snippet}</div>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(r.tags ?? []).slice(0, 3).map((tag) => (
                          <span key={tag} style={{
                            fontSize: 13, padding: '2px 6px', borderRadius: 20,
                            background: COLORS.tagBg, color: COLORS.tagText,
                          }}>{tag}</span>
                        ))}
                      </div>
                    </div>

                    {/* チェックボックス */}
                    {IS_OWNER && (
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginRight: 12,
                        border: `2px solid ${checked ? COLORS.primary : COLORS.border}`,
                        background: checked ? COLORS.primary : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {checked && <span style={{ color: '#fff', fontSize: 16 }}>✓</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 公開済みセクション */}
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>
            公開済みの記録（{published.length}件）
          </div>
          {published.length === 0 ? (
            <div style={{ textAlign: 'center', color: COLORS.textLight, padding: 20, fontSize: 16 }}>
              公開済みの記録はありません
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {published.map((r) => {
                const thumb   = getThumb(r);
                const snippet = getSnippet(r);
                return (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: COLORS.card, border: `1px solid ${COLORS.border}`,
                    borderRadius: 10, overflow: 'hidden',
                  }}>
                    {/* サムネイル */}
                    <div style={{ width: 64, height: 64, flexShrink: 0, background: '#E5E0D8' }}>
                      {thumb ? (
                        <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{
                          width: '100%', height: '100%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                        }}>{getCategoryIcon(r)}</div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, padding: '8px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 16 }}>🌐</span>
                        <span style={{ fontSize: 15, color: COLORS.textLight }}>
                          {r.date}{r.time ? ` ${r.time}` : ''}
                        </span>
                      </div>
                      {snippet && (
                        <div style={{
                          fontSize: 16, color: COLORS.text,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{snippet}</div>
                      )}
                    </div>
                    {IS_OWNER && (
                      <button onClick={() => handleUnpublish(r.id)} style={{ ...btnStyle, marginRight: 12 }}>
                        非公開に戻す
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 公開ボタン（オーナーのみ） */}
      {IS_OWNER && (
        <div style={{
          padding: '12px 16px', background: COLORS.card,
          borderTop: `1px solid ${COLORS.border}`, flexShrink: 0,
        }}>
          {publishing && progress && (
            <div style={{ textAlign: 'center', color: COLORS.textLight, fontSize: 16, marginBottom: 8 }}>
              {progress}
            </div>
          )}
          <button
            onClick={handlePublish}
            disabled={selected.length === 0 || publishing}
            style={{
              width: '100%', padding: '16px', borderRadius: 8, minHeight: 56,
              border: 'none', background: COLORS.primary,
              color: '#fff', fontSize: 18, fontWeight: 600,
              cursor: (selected.length === 0 || publishing) ? 'not-allowed' : 'pointer',
              opacity: (selected.length === 0 || publishing) ? 0.5 : 1,
            }}
          >
            {publishing
              ? '公開中…'
              : selected.length > 0
                ? `選択した${selected.length}件をまとめて公開`
                : '公開する記録を選択してください'}
          </button>
        </div>
      )}
    </div>
  );
}

const btnStyle = {
  padding: '8px 14px', borderRadius: 8, minHeight: 44,
  border: `1px solid #E5E0D8`, background: '#FFFFFF',
  color: '#888888', fontSize: 15, cursor: 'pointer', flexShrink: 0,
};
