// src/components/DetailScreen.jsx
import { useState, useEffect, useRef } from 'react';

const COLORS = {
  bg:           '#F7F5F0',
  card:         '#FFFFFF',
  primary:      '#4A7C59',
  primaryLight: '#E8F0E9',
  accent:       '#C8A96E',
  text:         '#2C2C2C',
  textLight:    '#888888',
  border:       '#E5E0D8',
  red:          '#E05C5C',
  tagBg:        '#E8F0E9',
  tagText:      '#3A6B47',
};

export function DetailScreen({ record, onClose, records, tags }) {
  const [editMode, setEditMode]     = useState(false);
  const [editDate, setEditDate]     = useState(record.date);
  const [editTime, setEditTime]     = useState(record.time);
  const [editComment, setEditComment] = useState(record.comment);
  const [editTags, setEditTags]     = useState(record.tags ?? []);
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImageUrl, setEditImageUrl]   = useState(null);
  const [imgUrl, setImgUrl]         = useState(null);
  const [saving, setSaving]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cameraRef = useRef();
  const albumRef  = useRef();

  // 表示用画像URL
  useEffect(() => {
    if (record.imageBlob) {
      const url = URL.createObjectURL(record.imageBlob);
      setImgUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [record.imageBlob]);

  // 編集中の画像プレビューURL
  useEffect(() => {
    if (editImageFile) {
      const url = URL.createObjectURL(editImageFile);
      setEditImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setEditImageUrl(null);
    }
  }, [editImageFile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        date:    editDate,
        time:    editTime,
        comment: editComment,
        tags:    editTags,
      };
      if (editImageFile) updates.imageFile = editImageFile;
      await records.update(record.id, updates);
      setEditMode(false);
      setEditImageFile(null);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await records.remove(record.id);
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const handleArchive = async () => {
    try {
      await records.toggleArchived(record.id);
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTag = (tag) => {
    setEditTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const displayImageUrl = editMode ? (editImageUrl || imgUrl) : imgUrl;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      background: COLORS.bg,
      maxWidth: 430,
      margin: '0 auto',
    }}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: COLORS.card,
        borderBottom: `1px solid ${COLORS.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>
          {editMode ? '記録を編集' : '記録の詳細'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {record.published && !editMode && (
            <span style={{
              background: COLORS.accent,
              color: '#fff',
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 20,
              fontWeight: 600,
            }}>公開済み</span>
          )}
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36,
              borderRadius: '50%',
              border: 'none',
              background: COLORS.primaryLight,
              cursor: 'pointer',
              fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>
      </div>

      {/* スクロールエリア */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* 写真エリア */}
        <div style={{ position: 'relative', background: '#000' }}>
          {displayImageUrl ? (
            <img
              src={displayImageUrl}
              alt="記録写真"
              style={{ width: '100%', maxHeight: 300, objectFit: 'contain', display: 'block' }}
            />
          ) : (
            <div style={{
              width: '100%', height: 200,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: COLORS.textLight, fontSize: 14, background: '#E5E0D8',
            }}>
              写真なし
            </div>
          )}
          {editMode && (
            <div style={{
              position: 'absolute', bottom: 8, right: 8,
              display: 'flex', gap: 8,
            }}>
              <button
                onClick={() => cameraRef.current?.click()}
                style={{
                  padding: '6px 12px', borderRadius: 8,
                  border: 'none', background: COLORS.primary, color: '#fff',
                  cursor: 'pointer', fontSize: 13,
                }}
              >📷 カメラ</button>
              <button
                onClick={() => albumRef.current?.click()}
                style={{
                  padding: '6px 12px', borderRadius: 8,
                  border: 'none', background: COLORS.primary, color: '#fff',
                  cursor: 'pointer', fontSize: 13,
                }}
              >🖼️ アルバム</button>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => setEditImageFile(e.target.files[0] || null)}
              />
              <input ref={albumRef} type="file" accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => setEditImageFile(e.target.files[0] || null)}
              />
            </div>
          )}
        </div>

        {/* 詳細情報 */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 日付・時刻 */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: COLORS.textLight, marginBottom: 4 }}>日付</div>
              {editMode ? (
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  style={{
                    width: '100%', padding: '8px', borderRadius: 8,
                    border: `1px solid ${COLORS.border}`, fontSize: 16,
                    background: COLORS.card, color: COLORS.text, boxSizing: 'border-box',
                  }}
                />
              ) : (
                <div style={{ fontSize: 16, fontWeight: 600 }}>{record.date || '—'}</div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: COLORS.textLight, marginBottom: 4 }}>時刻</div>
              {editMode ? (
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  style={{
                    width: '100%', padding: '8px', borderRadius: 8,
                    border: `1px solid ${COLORS.border}`, fontSize: 16,
                    background: COLORS.card, color: COLORS.text, boxSizing: 'border-box',
                  }}
                />
              ) : (
                <div style={{ fontSize: 16, fontWeight: 600 }}>{record.time || '—'}</div>
              )}
            </div>
          </div>

          {/* タグ */}
          <div>
            <div style={{ fontSize: 12, color: COLORS.textLight, marginBottom: 8 }}>タグ</div>
            {editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(tags.tags).map(([cat, tagList]) => (
                  <div key={cat}>
                    <div style={{ fontSize: 12, color: COLORS.textLight, marginBottom: 4 }}>{cat}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {tagList.map((tag) => {
                        const selected = editTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            style={{
                              padding: '4px 10px', borderRadius: 20,
                              border: `1px solid ${selected ? COLORS.primary : COLORS.border}`,
                              background: selected ? COLORS.primaryLight : COLORS.card,
                              color: selected ? COLORS.tagText : COLORS.textLight,
                              fontSize: 13, cursor: 'pointer',
                            }}
                          >{tag}</button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(record.tags ?? []).length > 0
                  ? record.tags.map((tag) => (
                    <span key={tag} style={{
                      padding: '4px 10px', borderRadius: 20,
                      background: COLORS.tagBg, color: COLORS.tagText,
                      fontSize: 13,
                    }}>{tag}</span>
                  ))
                  : <span style={{ color: COLORS.textLight, fontSize: 14 }}>タグなし</span>
                }
              </div>
            )}
          </div>

          {/* コメント */}
          <div>
            <div style={{ fontSize: 12, color: COLORS.textLight, marginBottom: 4 }}>コメント</div>
            {editMode ? (
              <textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                rows={3}
                style={{
                  width: '100%', padding: 8, borderRadius: 8,
                  border: `1px solid ${COLORS.border}`, fontSize: 16,
                  background: COLORS.card, color: COLORS.text,
                  resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            ) : (
              <div style={{ fontSize: 16, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {record.comment || <span style={{ color: COLORS.textLight }}>コメントなし</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 下部ボタンエリア */}
      <div style={{
        padding: '12px 16px',
        background: COLORS.card,
        borderTop: `1px solid ${COLORS.border}`,
        flexShrink: 0,
      }}>
        {editMode ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setEditMode(false); setEditImageFile(null); }}
              style={{
                flex: 1, padding: '12px', borderRadius: 8,
                border: `1px solid ${COLORS.border}`, background: COLORS.card,
                color: COLORS.text, fontSize: 16, cursor: 'pointer',
              }}
            >キャンセル</button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 2, padding: '12px', borderRadius: 8,
                border: 'none', background: COLORS.primary,
                color: '#fff', fontSize: 16, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >{saving ? '保存中…' : '保存'}</button>
          </div>
        ) : confirmDelete ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 14, color: COLORS.text, textAlign: 'center' }}>
              この記録を削除しますか？（元に戻せません）
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  border: `1px solid ${COLORS.border}`, background: COLORS.card,
                  color: COLORS.text, fontSize: 16, cursor: 'pointer',
                }}
              >キャンセル</button>
              <button
                onClick={handleDelete}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  border: 'none', background: COLORS.red,
                  color: '#fff', fontSize: 16, cursor: 'pointer',
                }}
              >削除する</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setEditMode(true)}
              style={{
                flex: 1, padding: '12px', borderRadius: 8,
                border: `1px solid ${COLORS.border}`, background: COLORS.card,
                color: COLORS.primary, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
            >✏️ 編集</button>
            <button
              onClick={handleArchive}
              style={{
                flex: 1, padding: '12px', borderRadius: 8,
                border: `1px solid ${COLORS.border}`, background: COLORS.card,
                color: record.archived ? COLORS.primary : COLORS.textLight,
                fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
            >📦 {record.archived ? '復元' : 'アーカイブ'}</button>
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                flex: 1, padding: '12px', borderRadius: 8,
                border: `1px solid ${COLORS.red}`, background: COLORS.card,
                color: COLORS.red, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
            >🗑️ 削除</button>
          </div>
        )}
      </div>
    </div>
  );
}
