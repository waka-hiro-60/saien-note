// src/components/AddScreen.jsx
import { useState, useRef, useEffect } from 'react';

const COLORS = {
  bg:           '#F7F5F0',
  card:         '#FFFFFF',
  primary:      '#4A7C59',
  primaryLight: '#E8F0E9',
  text:         '#2C2C2C',
  textLight:    '#888888',
  border:       '#E5E0D8',
  tagBg:        '#E8F0E9',
  tagText:      '#3A6B47',
};

function toLocalDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function toLocalTime() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

export function AddScreen({ records, tags, onDone }) {
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl,  setImageUrl]  = useState(null);
  const [date,      setDate]      = useState(toLocalDate());
  const [time,      setTime]      = useState(toLocalTime());
  const [comment,   setComment]   = useState('');
  const [selTags,   setSelTags]   = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState(null);

  const cameraRef = useRef();
  const albumRef  = useRef();

  useEffect(() => {
    if (!imageFile) { setImageUrl(null); return; }
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const toggleTag = (tag) => {
    setSelTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await records.add({
        date,
        time,
        imageFile: imageFile || null,
        comment,
        tags: selTags,
      });
      onDone();
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setSaving(false);
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
        <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>記録を追加</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* 写真エリア */}
        <div style={{
          background: '#000',
          minHeight: 220,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt="プレビュー"
                style={{ width: '100%', maxHeight: 280, objectFit: 'contain', display: 'block' }}
              />
              <div style={{
                position: 'absolute', bottom: 10, right: 10,
                display: 'flex', gap: 8,
              }}>
                <button
                  onClick={() => cameraRef.current?.click()}
                  style={{
                    padding: '6px 12px', borderRadius: 8,
                    border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff',
                    cursor: 'pointer', fontSize: 13,
                  }}
                >📷 再撮影</button>
                <button
                  onClick={() => albumRef.current?.click()}
                  style={{
                    padding: '6px 12px', borderRadius: 8,
                    border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff',
                    cursor: 'pointer', fontSize: 13,
                  }}
                >🖼️ 変更</button>
              </div>
            </>
          ) : (
            <div style={{
              display: 'flex', gap: 16, padding: 24,
            }}>
              <button
                onClick={() => cameraRef.current?.click()}
                style={{
                  flex: 1, padding: '24px 16px', borderRadius: 12,
                  border: `2px dashed ${COLORS.border}`,
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff', cursor: 'pointer', fontSize: 14,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                }}
              >
                <span style={{ fontSize: 32 }}>📷</span>
                カメラで撮影
              </button>
              <button
                onClick={() => albumRef.current?.click()}
                style={{
                  flex: 1, padding: '24px 16px', borderRadius: 12,
                  border: `2px dashed ${COLORS.border}`,
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff', cursor: 'pointer', fontSize: 14,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                }}
              >
                <span style={{ fontSize: 32 }}>🖼️</span>
                アルバムから選択
              </button>
            </div>
          )}
          <input
            ref={cameraRef}
            type="file" accept="image/*" capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => setImageFile(e.target.files[0] || null)}
          />
          <input
            ref={albumRef}
            type="file" accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => setImageFile(e.target.files[0] || null)}
          />
        </div>

        {/* フォーム */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{
              padding: 10, borderRadius: 8, background: '#FEE', color: '#C00', fontSize: 14,
            }}>エラー: {error}</div>
          )}

          {/* 日付・時刻 */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: COLORS.textLight, marginBottom: 4 }}>日付</div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8,
                  border: `1px solid ${COLORS.border}`, fontSize: 16,
                  background: COLORS.card, color: COLORS.text, boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: COLORS.textLight, marginBottom: 4 }}>時刻</div>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8,
                  border: `1px solid ${COLORS.border}`, fontSize: 16,
                  background: COLORS.card, color: COLORS.text, boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* タグ選択 */}
          <div>
            <div style={{ fontSize: 14, color: COLORS.textLight, marginBottom: 8 }}>タグ（複数選択可）</div>
            {tags.loading ? (
              <div style={{ color: COLORS.textLight, fontSize: 14 }}>読み込み中…</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(tags.tags).map(([cat, tagList]) => (
                  <div key={cat}>
                    <div style={{ fontSize: 13, color: COLORS.textLight, marginBottom: 6 }}>{cat}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {tagList.map((tag) => {
                        const selected = selTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            style={{
                              padding: '6px 12px', borderRadius: 20,
                              border: `1px solid ${selected ? COLORS.primary : COLORS.border}`,
                              background: selected ? COLORS.primaryLight : COLORS.card,
                              color: selected ? COLORS.tagText : COLORS.text,
                              fontSize: 14, cursor: 'pointer',
                              minHeight: 44,
                            }}
                          >{tag}</button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* コメント */}
          <div>
            <div style={{ fontSize: 14, color: COLORS.textLight, marginBottom: 4 }}>コメント</div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="気づきや作業内容を入力…"
              rows={3}
              style={{
                width: '100%', padding: '10px', borderRadius: 8,
                border: `1px solid ${COLORS.border}`, fontSize: 16,
                background: COLORS.card, color: COLORS.text,
                resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>

      {/* 保存ボタン */}
      <div style={{
        padding: '12px 16px',
        background: COLORS.card,
        borderTop: `1px solid ${COLORS.border}`,
        flexShrink: 0,
      }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '14px', borderRadius: 8,
            border: 'none', background: COLORS.primary,
            color: '#fff', fontSize: 16, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >{saving ? '保存中…' : '保存する'}</button>
      </div>
    </div>
  );
}
