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
  diaryBg:      '#FFF8F0',
  bedBg:        '#F0F5F0',
};

// ─────────────────────────────────────────
// 画像URL管理コンポーネント
// ─────────────────────────────────────────

function BlobImage({ blob, style = {}, placeholder = '🌿' }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!blob) { setUrl(null); return; }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  if (!url) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#E5E0D8', color: COLORS.textLight, fontSize: 32,
        ...style,
      }}>{placeholder}</div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }}
    />
  );
}

// ─────────────────────────────────────────
// 野菜記録の詳細レイアウト（既存互換）
// ─────────────────────────────────────────

function VeggieDetail({ record, editMode, editState, cameraRef, albumRef }) {
  const { editDate, setEditDate, editTime, setEditTime, editComment, setEditComment,
          editTags, setEditTags, editImageFile, setEditImageFile } = editState;
  const [editImageUrl, setEditImageUrl] = useState(null);
  const [imgUrl, setImgUrl] = useState(null);

  useEffect(() => {
    if (!record.imageBlob) return;
    const u = URL.createObjectURL(record.imageBlob);
    setImgUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [record.imageBlob]);

  useEffect(() => {
    if (!editImageFile) { setEditImageUrl(null); return; }
    const u = URL.createObjectURL(editImageFile);
    setEditImageUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [editImageFile]);

  const displayUrl = editMode ? (editImageUrl || imgUrl) : imgUrl;

  const toggleTag = (tag) => setEditTags((prev) =>
    prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
  );

  return { displayUrl, toggleTag };
}

// ─────────────────────────────────────────
// 畝記録の複数画像グリッド
// ─────────────────────────────────────────

function ImageGrid({ blobs, editable, onRemove }) {
  if (!blobs || blobs.length === 0) {
    return (
      <div style={{
        height: 160, background: '#E5E0D8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: COLORS.textLight, fontSize: 16,
      }}>
        写真なし
      </div>
    );
  }

  if (blobs.length === 1) {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ height: 260, background: '#000', position: 'relative' }}>
          <BlobImage
            blob={blobs[0]}
            style={{ objectFit: 'contain', position: 'absolute', inset: 0 }}
          />
        </div>
        {editable && (
          <button
            onClick={() => onRemove(0)}
            style={{
              position: 'absolute', top: 8, right: 8,
              width: 32, height: 32, borderRadius: '50%',
              border: 'none', background: 'rgba(0,0,0,0.6)',
              color: '#fff', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        )}
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 4, padding: 4,
      background: '#111',
    }}>
      {blobs.map((blob, i) => (
        <div key={i} style={{ position: 'relative', paddingTop: '100%' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 4, overflow: 'hidden' }}>
            <BlobImage blob={blob} />
          </div>
          {editable && (
            <button
              onClick={() => onRemove(i)}
              style={{
                position: 'absolute', top: 2, right: 2,
                width: 24, height: 24, borderRadius: '50%',
                border: 'none', background: 'rgba(0,0,0,0.6)',
                color: '#fff', fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0,
              }}
            >✕</button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// DetailScreen
// ─────────────────────────────────────────

export function DetailScreen({ record, onClose, records, tags }) {
  const category = record.category ?? 'veggie';

  // ─── 共通編集状態 ───
  const [editMode,       setEditMode]       = useState(false);
  const [editDate,       setEditDate]       = useState(record.date);
  const [editTime,       setEditTime]       = useState(record.time);
  const [editComment,    setEditComment]    = useState(record.comment ?? '');
  const [editText,       setEditText]       = useState(record.text ?? '');
  const [editTags,       setEditTags]       = useState(record.tags ?? []);
  const [editImages,     setEditImages]     = useState(record.images ?? []);
  const [editImageFile,  setEditImageFile]  = useState(null);  // veggie用
  const [newImageFiles,  setNewImageFiles]  = useState([]);    // bed/diary追加用

  const [saving,         setSaving]         = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);

  const cameraRef = useRef();
  const albumRef  = useRef();

  // veggie用表示URL
  const [imgUrl,     setImgUrl]     = useState(null);
  const [editImgUrl, setEditImgUrl] = useState(null);

  useEffect(() => {
    if (category !== 'veggie' || !record.imageBlob) return;
    const u = URL.createObjectURL(record.imageBlob);
    setImgUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [record.imageBlob, category]);

  useEffect(() => {
    if (!editImageFile) { setEditImgUrl(null); return; }
    const u = URL.createObjectURL(editImageFile);
    setEditImgUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [editImageFile]);

  const toggleEditTag = (tag) => setEditTags((prev) =>
    prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
  );

  const handleRemoveEditImage = (index) => {
    setEditImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddNewImages = (files) => {
    setNewImageFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const handleRemoveNewImage = (index) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── 保存 ───
  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = { date: editDate, time: editTime };

      if (category === 'veggie') {
        updates.comment = editComment;
        updates.tags    = editTags;
        if (editImageFile) updates.imageFile = editImageFile;
      } else if (category === 'bed') {
        updates.comment = editComment;
        updates.tags    = editTags;
        // 残っているblob配列をそのまま渡す（削除反映）
        updates.images = editImages;
        // 新しいファイルを追加
        if (newImageFiles.length > 0) updates.addImageFiles = newImageFiles;
      } else {
        // diary
        updates.text   = editText;
        updates.images = editImages;
        if (newImageFiles.length > 0) updates.addImageFiles = newImageFiles;
      }

      await records.update(record.id, updates);
      setEditMode(false);
      setEditImageFile(null);
      setNewImageFiles([]);
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

  // カテゴリ別のタイトルアイコン
  const headerIcon  = category === 'diary' ? '📔' : category === 'bed' ? '🌱' : '🥬';
  const headerTitle = category === 'diary' ? '活動日記' : category === 'bed' ? '畝の記録' : '野菜記録';
  const headerBg    = category === 'diary' ? COLORS.diaryBg : category === 'bed' ? COLORS.bedBg : COLORS.card;

  // 編集中の新規追加画像プレビューURL（クリーンアップ）
  const [newImageUrls, setNewImageUrls] = useState([]);
  useEffect(() => {
    const urls = newImageFiles.map((f) => URL.createObjectURL(f));
    setNewImageUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [newImageFiles]);

  const veggieTags = tags.tags.野菜 ?? [];

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
        background: headerBg,
        borderBottom: `1px solid ${COLORS.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>
          {headerIcon} {editMode ? '編集中' : headerTitle}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {record.published && !editMode && (
            <span style={{
              background: COLORS.accent, color: '#fff',
              fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
            }}>公開済み</span>
          )}
          <button
            onClick={onClose}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              border: 'none', background: COLORS.primaryLight,
              cursor: 'pointer', fontSize: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>
      </div>

      {/* スクロールエリア */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ─── 野菜記録レイアウト ─── */}
        {category === 'veggie' && (
          <>
            <div style={{ position: 'relative', background: '#000' }}>
              {(editMode ? (editImgUrl || imgUrl) : imgUrl) ? (
                <img
                  src={editMode ? (editImgUrl || imgUrl) : imgUrl}
                  alt="記録写真"
                  style={{ width: '100%', maxHeight: 300, objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: 200,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: COLORS.textLight, fontSize: 16, background: '#E5E0D8',
                }}>写真なし</div>
              )}
              {editMode && (
                <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 8 }}>
                  <button onClick={() => cameraRef.current?.click()} style={editImgBtnStyle}>📷 カメラ</button>
                  <button onClick={() => albumRef.current?.click()} style={editImgBtnStyle}>🖼️ アルバム</button>
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment"
                    style={{ display: 'none' }} onChange={(e) => setEditImageFile(e.target.files[0] || null)} />
                  <input ref={albumRef} type="file" accept="image/*"
                    style={{ display: 'none' }} onChange={(e) => setEditImageFile(e.target.files[0] || null)} />
                </div>
              )}
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <DateTimeFields
                editMode={editMode}
                date={record.date} time={record.time}
                editDate={editDate} setEditDate={setEditDate}
                editTime={editTime} setEditTime={setEditTime}
              />
              <TagSection
                editMode={editMode}
                tags={record.tags}
                editTags={editTags}
                allTags={tags.tags}
                onToggle={toggleEditTag}
              />
              <CommentSection
                editMode={editMode}
                comment={record.comment}
                editComment={editComment}
                setEditComment={setEditComment}
              />
            </div>
          </>
        )}

        {/* ─── 畝の記録レイアウト ─── */}
        {category === 'bed' && (
          <>
            <ImageGrid
              blobs={editMode ? editImages : (record.images ?? [])}
              editable={editMode}
              onRemove={handleRemoveEditImage}
            />
            {editMode && (
              <div style={{ background: '#111', padding: '8px 12px' }}>
                {newImageUrls.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    {newImageUrls.map((url, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img src={url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                        <button onClick={() => handleRemoveNewImage(i)} style={{
                          position: 'absolute', top: 0, right: 0,
                          width: 18, height: 18, borderRadius: '50%',
                          border: 'none', background: 'rgba(0,0,0,0.7)',
                          color: '#fff', fontSize: 11, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                        }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => cameraRef.current?.click()} style={editImgBtnStyle}>📷 追加（カメラ）</button>
                  <button onClick={() => albumRef.current?.click()} style={editImgBtnStyle}>🖼️ 追加（アルバム）</button>
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple
                    style={{ display: 'none' }} onChange={(e) => handleAddNewImages(e.target.files)} />
                  <input ref={albumRef} type="file" accept="image/*" multiple
                    style={{ display: 'none' }} onChange={(e) => handleAddNewImages(e.target.files)} />
                </div>
              </div>
            )}
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, background: COLORS.bedBg }}>
              <DateTimeFields
                editMode={editMode}
                date={record.date} time={record.time}
                editDate={editDate} setEditDate={setEditDate}
                editTime={editTime} setEditTime={setEditTime}
              />
              {/* 畝名と関連野菜の表示 */}
              {!editMode && (
                <BedVeggieInfo tags={record.tags ?? []} veggieTags={veggieTags} />
              )}
              <TagSection
                editMode={editMode}
                tags={record.tags}
                editTags={editTags}
                allTags={tags.tags}
                onToggle={toggleEditTag}
              />
              <CommentSection
                editMode={editMode}
                comment={record.comment}
                editComment={editComment}
                setEditComment={setEditComment}
              />
            </div>
          </>
        )}

        {/* ─── 活動日記レイアウト ─── */}
        {category === 'diary' && (
          <>
            <ImageGrid
              blobs={editMode ? editImages : (record.images ?? [])}
              editable={editMode}
              onRemove={handleRemoveEditImage}
            />
            {editMode && (
              <div style={{ background: '#111', padding: '8px 12px' }}>
                {newImageUrls.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    {newImageUrls.map((url, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img src={url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                        <button onClick={() => handleRemoveNewImage(i)} style={{
                          position: 'absolute', top: 0, right: 0,
                          width: 18, height: 18, borderRadius: '50%',
                          border: 'none', background: 'rgba(0,0,0,0.7)',
                          color: '#fff', fontSize: 11, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                        }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => cameraRef.current?.click()} style={editImgBtnStyle}>📷 追加</button>
                  <button onClick={() => albumRef.current?.click()} style={editImgBtnStyle}>🖼️ 追加</button>
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple
                    style={{ display: 'none' }} onChange={(e) => handleAddNewImages(e.target.files)} />
                  <input ref={albumRef} type="file" accept="image/*" multiple
                    style={{ display: 'none' }} onChange={(e) => handleAddNewImages(e.target.files)} />
                </div>
              </div>
            )}
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, background: COLORS.diaryBg }}>
              <DateTimeFields
                editMode={editMode}
                date={record.date} time={record.time}
                editDate={editDate} setEditDate={setEditDate}
                editTime={editTime} setEditTime={setEditTime}
              />
              {/* 日記テキスト */}
              <div>
                <div style={{ fontSize: 16, color: COLORS.textLight, marginBottom: 6 }}>日記</div>
                {editMode ? (
                  <>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value.slice(0, 500))}
                      rows={8}
                      style={{
                        width: '100%', padding: '12px', borderRadius: 8,
                        border: `1px solid ${COLORS.border}`, fontSize: 18,
                        background: COLORS.card, color: COLORS.text,
                        resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.7,
                      }}
                    />
                    <div style={{ textAlign: 'right', fontSize: 14, color: COLORS.textLight }}>
                      {editText.length} / 500
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 18, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: COLORS.text }}>
                    {record.text || <span style={{ color: COLORS.textLight }}>テキストなし</span>}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
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
              onClick={() => { setEditMode(false); setEditImageFile(null); setNewImageFiles([]); setEditImages(record.images ?? []); }}
              style={cancelBtnStyle}
            >キャンセル</button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ ...saveBtnStyle, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
            >{saving ? '保存中…' : '保存'}</button>
          </div>
        ) : confirmDelete ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 18, color: COLORS.text, textAlign: 'center', padding: '4px 0' }}>
              この記録を削除しますか？（元に戻せません）
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ ...cancelBtnStyle, minHeight: 56, fontSize: 18 }}
              >キャンセル</button>
              <button
                onClick={handleDelete}
                style={{
                  flex: 1, padding: '14px', borderRadius: 8, minHeight: 56,
                  border: 'none', background: COLORS.red,
                  color: '#fff', fontSize: 18, fontWeight: 700, cursor: 'pointer',
                }}
              >削除する</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setEditMode(true)}
              style={{
                flex: 1, padding: '12px', borderRadius: 8, minHeight: 56,
                border: `1px solid ${COLORS.border}`, background: COLORS.card,
                color: COLORS.primary, fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
            >✏️ 編集</button>
            <button
              onClick={handleArchive}
              style={{
                flex: 1, padding: '12px', borderRadius: 8, minHeight: 56,
                border: `1px solid ${COLORS.border}`, background: COLORS.card,
                color: record.archived ? COLORS.primary : COLORS.textLight,
                fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
            >📦 {record.archived ? '復元' : 'アーカイブ'}</button>
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                flex: 1, padding: '12px', borderRadius: 8, minHeight: 56,
                border: `1px solid ${COLORS.red}`, background: COLORS.card,
                color: COLORS.red, fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
            >🗑️ 削除</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 共通サブコンポーネント
// ─────────────────────────────────────────

function DateTimeFields({ editMode, date, time, editDate, setEditDate, editTime, setEditTime }) {
  const fieldStyle = {
    width: '100%', padding: '10px', borderRadius: 8,
    border: `1px solid ${COLORS.border}`, fontSize: 18,
    background: COLORS.card, color: COLORS.text, boxSizing: 'border-box',
    minHeight: 48,
  };
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, color: COLORS.textLight, marginBottom: 4 }}>日付</div>
        {editMode
          ? <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={fieldStyle} />
          : <div style={{ fontSize: 18, fontWeight: 600 }}>{date || '—'}</div>
        }
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, color: COLORS.textLight, marginBottom: 4 }}>時刻</div>
        {editMode
          ? <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} style={fieldStyle} />
          : <div style={{ fontSize: 18, fontWeight: 600 }}>{time || '—'}</div>
        }
      </div>
    </div>
  );
}

function TagSection({ editMode, tags, editTags, allTags, onToggle }) {
  return (
    <div>
      <div style={{ fontSize: 16, color: COLORS.textLight, marginBottom: 8 }}>タグ</div>
      {editMode ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.entries(allTags).map(([cat, tagList]) => (
            <div key={cat}>
              <div style={{ fontSize: 14, color: COLORS.textLight, marginBottom: 4 }}>{cat}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {tagList.map((tag) => {
                  const selected = editTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => onToggle(tag)}
                      style={{
                        padding: '8px 14px', borderRadius: 20, minHeight: 44,
                        border: `2px solid ${selected ? COLORS.primary : COLORS.border}`,
                        background: selected ? COLORS.primaryLight : COLORS.card,
                        color: selected ? COLORS.tagText : COLORS.textLight,
                        fontSize: 16, cursor: 'pointer', fontWeight: selected ? 700 : 400,
                      }}
                    >{tag}</button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(tags ?? []).length > 0
            ? (tags ?? []).map((tag) => (
              <span key={tag} style={{
                padding: '6px 12px', borderRadius: 20,
                background: COLORS.tagBg, color: COLORS.tagText, fontSize: 16,
              }}>{tag}</span>
            ))
            : <span style={{ color: COLORS.textLight, fontSize: 16 }}>タグなし</span>
          }
        </div>
      )}
    </div>
  );
}

function CommentSection({ editMode, comment, editComment, setEditComment }) {
  return (
    <div>
      <div style={{ fontSize: 16, color: COLORS.textLight, marginBottom: 4 }}>コメント</div>
      {editMode ? (
        <textarea
          value={editComment}
          onChange={(e) => setEditComment(e.target.value)}
          rows={3}
          style={{
            width: '100%', padding: '10px', borderRadius: 8,
            border: `1px solid ${COLORS.border}`, fontSize: 18,
            background: COLORS.card, color: COLORS.text,
            resize: 'vertical', boxSizing: 'border-box',
          }}
        />
      ) : (
        <div style={{ fontSize: 18, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {comment || <span style={{ color: COLORS.textLight }}>コメントなし</span>}
        </div>
      )}
    </div>
  );
}

function BedVeggieInfo({ tags, veggieTags }) {
  const veggies = tags.filter((t) => veggieTags.includes(t));
  const places  = tags.filter((t) => !veggieTags.includes(t));

  if (veggies.length === 0 && places.length === 0) return null;
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 10,
      background: '#D0E4D0', border: `1px solid #B0D0B0`,
    }}>
      {places.length > 0 && (
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.primary, marginBottom: 4 }}>
          {places.join(' / ')}
        </div>
      )}
      {veggies.length > 0 && (
        <div style={{ fontSize: 16, color: COLORS.text }}>
          栽培中: {veggies.join('、')}
        </div>
      )}
    </div>
  );
}

// ─── スタイル定数 ───
const editImgBtnStyle = {
  padding: '8px 14px', borderRadius: 8,
  border: 'none', background: COLORS.primary, color: '#fff',
  cursor: 'pointer', fontSize: 15, minHeight: 44,
};

const cancelBtnStyle = {
  flex: 1, padding: '14px', borderRadius: 8, minHeight: 56,
  border: `1px solid ${COLORS.border}`, background: COLORS.card,
  color: COLORS.text, fontSize: 17, cursor: 'pointer',
};

const saveBtnStyle = {
  flex: 2, padding: '14px', borderRadius: 8, minHeight: 56,
  border: 'none', background: COLORS.primary,
  color: '#fff', fontSize: 17, fontWeight: 700,
};
