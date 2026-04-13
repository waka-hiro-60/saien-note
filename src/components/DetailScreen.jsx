// src/components/DetailScreen.jsx
import { useState, useEffect, useRef } from 'react';
import { compressImage } from '../utils/db';

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
// ユーティリティ（旧Blob形式の後方互換用）
// ─────────────────────────────────────────

/** Blob / File → base64 データURL（旧フォーマットの閲覧用） */
function blobToBase64(blob) {
  return new Promise((resolve) => {
    if (!blob) { resolve(null); return; }
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target?.result ?? null);
    reader.onerror = ()  => resolve(null);
    reader.readAsDataURL(blob);
  });
}

// ─────────────────────────────────────────
// ImageGrid
// srcs: Base64文字列配列（常にsrcsモードで使用）
// editable: trueのとき削除ボタンを表示
// ─────────────────────────────────────────

function ImageGrid({ srcs, editable, onRemove }) {
  const count = (srcs ?? []).length;

  if (count === 0) {
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

  if (count === 1) {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ height: 260, background: '#000', position: 'relative' }}>
          <img
            src={srcs[0]}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute', inset: 0 }}
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
      {srcs.map((src, i) => (
        <div key={i} style={{ position: 'relative', paddingTop: '100%' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 4, overflow: 'hidden' }}>
            <img
              src={src}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
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
  const [editMode,      setEditMode]      = useState(false);
  const [editDate,      setEditDate]      = useState(record.date);
  const [editTime,      setEditTime]      = useState(record.time);
  const [editComment,   setEditComment]   = useState(record.comment ?? '');
  const [editText,      setEditText]      = useState(record.text ?? '');
  const [editTags,      setEditTags]      = useState(record.tags ?? []);
  const [saving,        setSaving]        = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cameraRef = useRef();
  const albumRef  = useRef();
  const editInitRef = useRef(false);

  // ─── 写真管理（Base64一元管理） ───────────────────────
  //
  // 【veggie】単一画像
  //   viewImgBase64 : 閲覧モード用（record.imageBase64、旧Blobは変換して表示）
  //   editImgBase64 : 編集モードで新規選択した画像（compressImageで即時Base64化）
  //   表示: editMode ? (editImgBase64 || viewImgBase64) : viewImgBase64
  //
  // 【bed / diary】複数画像
  //   allImageBase64[] : 編集中の全写真をBase64で一元管理
  //     - 編集モード開始時: record.imageBase64sをそのまま初期化
  //     - 写真追加時: compressImageでBase64化して追加
  //     - 写真削除時: 該当インデックスを除外
  //     - 保存時: allImageBase64をそのまま渡す
  // ─────────────────────────────────────────────────────

  // veggie: 閲覧モード表示（旧Blob形式も後方互換で対応）
  const [viewImgBase64, setViewImgBase64] = useState(null);
  useEffect(() => {
    if (category !== 'veggie') { setViewImgBase64(null); return; }
    if (record.imageBase64) { setViewImgBase64(record.imageBase64); return; }
    if (record.imageBlob)   { blobToBase64(record.imageBlob).then(setViewImgBase64); return; }
    setViewImgBase64(null);
  }, [record.imageBase64, record.imageBlob, category]);

  // veggie: 編集モードで新規選択した画像（Base64で管理）
  const [editImgBase64, setEditImgBase64] = useState(null);

  // bed/diary: 編集モードの全写真（Base64一元管理）
  const [allImageBase64, setAllImageBase64] = useState([]);

  // 編集モード開始時に既存画像を初期化
  useEffect(() => {
    if (!editMode || category === 'veggie') return;
    if (editInitRef.current) return;
    editInitRef.current = true;

    // 新フォーマット: imageBase64s（文字列配列）
    if (record.imageBase64s) {
      setAllImageBase64([...record.imageBase64s]);
      return;
    }
    // 旧フォーマット: images（Blob配列）
    const blobs = record.images ?? [];
    if (blobs.length === 0) { setAllImageBase64([]); return; }
    let cancelled = false;
    Promise.all(blobs.map(blobToBase64)).then((results) => {
      if (!cancelled) setAllImageBase64(results.filter(Boolean));
    });
    return () => { cancelled = true; };
  }, [editMode, category]);

  // 写真追加（bed/diary）
  // ⚠️ input.value='' は処理後にクリアする（iOS Safari対応）
  const handleAddImages = async (files, inputRef) => {
    const arr = Array.from(files);
    for (const file of arr) {
      try {
        const base64 = await compressImage(file);
        if (base64) setAllImageBase64((prev) => [...prev, base64]);
      } catch (e) {
        console.warn('写真追加失敗:', e);
      }
    }
    if (inputRef?.current) inputRef.current.value = '';
  };

  // 写真削除（bed/diary）
  const handleRemoveImage = (index) => {
    setAllImageBase64((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── タグ編集 ───
  const veggieTags   = tags.tags.野菜 ?? [];
  const placeTags    = tags.tags.場所 ?? [];
  const bedVeggieMap = tags.bedVeggieMap ?? {};

  const toggleEditTag = (tag) => {
    setEditTags((prev) => {
      const isSelected = prev.includes(tag);
      let next = isSelected ? prev.filter((t) => t !== tag) : [...prev, tag];

      if (!isSelected) {
        if (veggieTags.includes(tag)) {
          for (const [bed, veggies] of Object.entries(bedVeggieMap)) {
            if (veggies.includes(tag) && !next.includes(bed)) next.push(bed);
          }
        } else if (placeTags.includes(tag)) {
          for (const bed of placeTags) {
            if (bed !== tag && prev.includes(bed)) {
              const oldVeggies = bedVeggieMap[bed] ?? [];
              next = next.filter((t) => !oldVeggies.includes(t));
            }
          }
          const linked = bedVeggieMap[tag] ?? [];
          for (const v of linked) {
            if (!next.includes(v)) next.push(v);
          }
        }
      } else {
        if (placeTags.includes(tag)) {
          const linked = bedVeggieMap[tag] ?? [];
          next = next.filter((t) => !linked.includes(t));
        }
      }

      return next;
    });
  };

  // ─── 保存 ───
  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = { date: editDate, time: editTime };

      if (category === 'veggie') {
        updates.comment = editComment;
        updates.tags    = editTags;
        // 新しい画像が選択された場合のみ上書き（未変更時はundefinedのままにしてdb.jsで既存保持）
        if (editImgBase64) updates.imageBase64 = editImgBase64;
      } else if (category === 'bed') {
        updates.comment      = editComment;
        updates.tags         = editTags;
        updates.imageBase64s = allImageBase64;
      } else {
        // diary
        updates.text         = editText;
        updates.imageBase64s = allImageBase64;
      }

      await records.update(record.id, updates);
      editInitRef.current = false;
      setEditMode(false);
      setEditImgBase64(null);
      setAllImageBase64([]);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // ─── キャンセル ───
  const handleCancel = () => {
    editInitRef.current = false;
    setEditMode(false);
    setEditImgBase64(null);
    setAllImageBase64([]);
  };

  // ─── 削除 ───
  const handleDelete = async () => {
    try {
      await records.remove(record.id);
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  // ─── アーカイブ ───
  const handleArchive = async () => {
    try {
      await records.toggleArchived(record.id);
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  // ─── ヘッダー設定 ───
  const headerIcon  = category === 'diary' ? '📔' : category === 'bed' ? '🌱' : '🥬';
  const headerTitle = category === 'diary' ? '活動日記' : category === 'bed' ? '畝の記録' : '野菜記録';
  const headerBg    = category === 'diary' ? COLORS.diaryBg : category === 'bed' ? COLORS.bedBg : COLORS.card;

  // veggie 表示: 編集中は新規選択があれば editImgBase64、なければ viewImgBase64
  const veggieDisplaySrc = editMode ? (editImgBase64 || viewImgBase64) : viewImgBase64;

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
              {veggieDisplaySrc ? (
                <img
                  src={veggieDisplaySrc}
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
                  {/* veggie編集: 選択後すぐにcompressImage → editImgBase64にセット */}
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const b64 = await compressImage(file);
                      if (b64) setEditImgBase64(b64);
                      if (cameraRef.current) cameraRef.current.value = '';
                    }} />
                  <input ref={albumRef} type="file" accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const b64 = await compressImage(file);
                      if (b64) setEditImgBase64(b64);
                      if (albumRef.current) albumRef.current.value = '';
                    }} />
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
              srcs={editMode ? allImageBase64 : (record.imageBase64s ?? [])}
              editable={editMode}
              onRemove={handleRemoveImage}
            />
            {editMode && (
              <div style={{ background: '#111', padding: '8px 12px' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => cameraRef.current?.click()} style={editImgBtnStyle}>📷 追加（カメラ）</button>
                  <button onClick={() => albumRef.current?.click()} style={editImgBtnStyle}>🖼️ 追加（アルバム）</button>
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handleAddImages(e.target.files, cameraRef)} />
                  <input ref={albumRef} type="file" accept="image/*" multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handleAddImages(e.target.files, albumRef)} />
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
              srcs={editMode ? allImageBase64 : (record.imageBase64s ?? [])}
              editable={editMode}
              onRemove={handleRemoveImage}
            />
            {editMode && (
              <div style={{ background: '#111', padding: '8px 12px' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => cameraRef.current?.click()} style={editImgBtnStyle}>📷 追加</button>
                  <button onClick={() => albumRef.current?.click()} style={editImgBtnStyle}>🖼️ 追加</button>
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handleAddImages(e.target.files, cameraRef)} />
                  <input ref={albumRef} type="file" accept="image/*" multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handleAddImages(e.target.files, albumRef)} />
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
            <button onClick={handleCancel} style={cancelBtnStyle}>キャンセル</button>
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
  const veggies = tags.filter((t) =>  veggieTags.includes(t));
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
