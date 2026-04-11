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

const IS_OWNER      = import.meta.env.VITE_OWNER_MODE === 'true';
const API_ENDPOINT  = 'https://api.saien.career-life.tech/publish';

async function publishToApi(selectedRecords) {
  const apiKey = import.meta.env.VITE_API_KEY;

  const formData = new FormData();
  const recordsMeta = selectedRecords.map((r) => ({
    id:       r.id,
    date:     r.date,
    time:     r.time,
    comment:  r.comment,
    text:     r.text,
    tags:     r.tags,
    category: r.category,
    imageKey: r.id,
  }));

  formData.append('records', JSON.stringify(recordsMeta));

  for (const r of selectedRecords) {
    if (r.imageBlob) {
      formData.append(`image_${r.id}`, r.imageBlob, `${r.id}.jpg`);
    }
    if (r.images) {
      r.images.forEach((blob, i) => {
        formData.append(`image_${r.id}_${i}`, blob, `${r.id}_${i}.jpg`);
      });
    }
  }

  if (!apiKey) {
    console.log('[PublishScreen] VITE_API_KEY 未設定のためモック送信:', recordsMeta);
    return { ok: true, mock: true };
  }

  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`APIエラー ${res.status}: ${text}`);
  }

  return res.json();
}

function getCategoryIcon(r) {
  const cat = r.category ?? 'veggie';
  if (cat === 'diary') return '📔';
  if (cat === 'bed')   return '🌱';
  return '🥬';
}

export function PublishScreen({ records }) {
  const [selected,   setSelected]   = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [error,      setError]      = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const unpublished = records.records.filter((r) => !r.archived && !r.published);
  const published   = records.records.filter((r) => !r.archived &&  r.published);

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelected(unpublished.map((r) => r.id));
  const clearAll  = () => setSelected([]);

  const handlePublish = async () => {
    if (!IS_OWNER || selected.length === 0) return;
    setPublishing(true);
    setError(null);
    setSuccessMsg('');
    try {
      const targets = records.records.filter((r) => selected.includes(r.id));
      const result  = await publishToApi(targets);
      if (result.mock) console.log('[PublishScreen] モック公開完了:', selected);
      await records.publish(selected);
      setSelected([]);
      setSuccessMsg(`${targets.length}件を公開しました`);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async (id) => {
    try {
      await records.unpublish(id);
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ヘッダー */}
      <div style={{
        padding: '14px 16px 10px',
        background: COLORS.card,
        borderBottom: `1px solid ${COLORS.border}`,
        flexShrink: 0,
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
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={selectAll}
                style={{
                  padding: '8px 14px', borderRadius: 8, minHeight: 44,
                  border: `1px solid ${COLORS.border}`, background: COLORS.card,
                  color: COLORS.textLight, fontSize: 16, cursor: 'pointer',
                }}
              >全選択</button>
              <button
                onClick={clearAll}
                style={{
                  padding: '8px 14px', borderRadius: 8, minHeight: 44,
                  border: `1px solid ${COLORS.border}`, background: COLORS.card,
                  color: COLORS.textLight, fontSize: 16, cursor: 'pointer',
                }}
              >解除</button>
            </div>
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
                const checked = selected.includes(r.id);
                const label   = r.text || r.comment || '';
                return (
                  <div
                    key={r.id}
                    onClick={() => toggleSelect(r.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: checked ? COLORS.primaryLight : COLORS.card,
                      border: `1px solid ${checked ? COLORS.primary : COLORS.border}`,
                      borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
                      minHeight: 56,
                    }}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: 8,
                      border: `2px solid ${checked ? COLORS.primary : COLORS.border}`,
                      background: checked ? COLORS.primary : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {checked && <span style={{ color: '#fff', fontSize: 16 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 20 }}>{getCategoryIcon(r)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, color: COLORS.textLight }}>{r.date}{r.time ? ` ${r.time}` : ''}</div>
                      {label && (
                        <div style={{
                          fontSize: 18, color: COLORS.text,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{label}</div>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {(r.tags ?? []).slice(0, 3).map((tag) => (
                          <span key={tag} style={{
                            fontSize: 14, padding: '2px 8px', borderRadius: 20,
                            background: COLORS.tagBg, color: COLORS.tagText,
                          }}>{tag}</span>
                        ))}
                      </div>
                    </div>
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
              {published.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: COLORS.card, border: `1px solid ${COLORS.border}`,
                    borderRadius: 10, padding: '12px 16px',
                  }}
                >
                  <span style={{ fontSize: 22 }}>🌐</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, color: COLORS.textLight }}>{r.date}{r.time ? ` ${r.time}` : ''}</div>
                    {(r.text || r.comment) && (
                      <div style={{
                        fontSize: 18, color: COLORS.text,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{r.text || r.comment}</div>
                    )}
                  </div>
                  {IS_OWNER && (
                    <button
                      onClick={() => handleUnpublish(r.id)}
                      style={{
                        padding: '8px 14px', borderRadius: 8, minHeight: 44,
                        border: `1px solid ${COLORS.border}`, background: COLORS.card,
                        color: COLORS.textLight, fontSize: 15, cursor: 'pointer', flexShrink: 0,
                      }}
                    >非公開に戻す</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 公開ボタン（オーナーモードのみ） */}
      {IS_OWNER && (
        <div style={{
          padding: '12px 16px',
          background: COLORS.card,
          borderTop: `1px solid ${COLORS.border}`,
          flexShrink: 0,
        }}>
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
                : '公開する記録を選択してください'
            }
          </button>
        </div>
      )}
    </div>
  );
}
