// src/components/AddScreen.jsx
import { useState, useRef, useEffect, useCallback } from 'react';

// 画像ファイルから日時を取得して { date: 'YYYY-MM-DD', time: 'HH:MM' } を返す
// ① exifr の DateTimeOriginal → ② File.lastModified → ③ null（今日の日付のまま）
async function getDateTimeFromFile(file) {
  // ① exifr で DateTimeOriginal を試みる
  try {
    const exifr = (await import('exifr')).default;
    const result = await exifr.parse(file, ['DateTimeOriginal']);
    const dt = result?.DateTimeOriginal;
    if (dt) {
      const d = dt instanceof Date ? dt : new Date(dt);
      if (!isNaN(d.getTime())) {
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        console.log('[Exif] ① DateTimeOriginal (exifr):', date, time);
        return { date, time };
      }
    }
    console.log('[Exif] DateTimeOriginal が取得できなかった。File.lastModified を試みる…');
  } catch (e) {
    console.log('[Exif] exifr.parse() 失敗 (iOS等):', e.message, '→ File.lastModified を試みる…');
  }

  // ② File.lastModified をフォールバックとして使用
  if (file.lastModified) {
    try {
      const d = new Date(file.lastModified);
      if (!isNaN(d.getTime())) {
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        console.log('[Exif] ② File.lastModified フォールバック:', date, time);
        return { date, time };
      }
    } catch (e) {
      console.log('[Exif] File.lastModified も失敗:', e.message);
    }
  }

  // ③ 今日の日付のまま
  console.log('[Exif] ③ Exif・lastModified ともに取得不可。今日の日付を使用。');
  return null;
}

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

const MODES = [
  { id: 'veggie', label: '野菜記録', icon: '🥬' },
  { id: 'bed',    label: '畝の記録', icon: '🌱' },
  { id: 'diary',  label: '活動日記', icon: '📔' },
];

function toLocalDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toLocalTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 複数画像プレビューコンポーネント
function MultiImagePreview({ files, onRemove, onAddCamera, onAddAlbum, cameraRef, albumRef }) {
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    const created = files.map((f) => URL.createObjectURL(f));
    setUrls(created);
    return () => created.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  return (
    <div style={{ padding: 12, background: '#111' }}>
      {urls.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
          marginBottom: 10,
        }}>
          {urls.map((url, i) => (
            <div key={i} style={{ position: 'relative', paddingTop: '100%' }}>
              <img
                src={url}
                alt=""
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%', objectFit: 'cover',
                  borderRadius: 6,
                }}
              />
              <button
                onClick={() => onRemove(i)}
                style={{
                  position: 'absolute', top: 2, right: 2,
                  width: 24, height: 24, borderRadius: '50%',
                  border: 'none', background: 'rgba(0,0,0,0.6)',
                  color: '#fff', fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0,
                }}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => cameraRef.current?.click()}
          style={{
            flex: 1, padding: '14px 8px', borderRadius: 10,
            border: `2px dashed ${COLORS.border}`,
            background: 'rgba(255,255,255,0.05)',
            color: '#fff', cursor: 'pointer', fontSize: 16,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            minHeight: 72,
          }}
        >
          <span style={{ fontSize: 24 }}>📷</span>
          カメラ
        </button>
        <button
          onClick={() => albumRef.current?.click()}
          style={{
            flex: 1, padding: '14px 8px', borderRadius: 10,
            border: `2px dashed ${COLORS.border}`,
            background: 'rgba(255,255,255,0.05)',
            color: '#fff', cursor: 'pointer', fontSize: 16,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            minHeight: 72,
          }}
        >
          <span style={{ fontSize: 24 }}>🖼️</span>
          アルバム
        </button>
      </div>
    </div>
  );
}

// 単一画像プレビューコンポーネント（野菜記録用）
function SingleImagePreview({ imageFile, onCamera, onAlbum, cameraRef, albumRef }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!imageFile) { setUrl(null); return; }
    const u = URL.createObjectURL(imageFile);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [imageFile]);

  return (
    <div style={{
      background: '#000', minHeight: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      {url ? (
        <>
          <img
            src={url}
            alt="プレビュー"
            style={{ width: '100%', maxHeight: 280, objectFit: 'contain', display: 'block' }}
          />
          <div style={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', gap: 8 }}>
            <button
              onClick={() => cameraRef.current?.click()}
              style={{
                padding: '8px 14px', borderRadius: 8,
                border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff',
                cursor: 'pointer', fontSize: 16, minHeight: 44,
              }}
            >📷 再撮影</button>
            <button
              onClick={() => albumRef.current?.click()}
              style={{
                padding: '8px 14px', borderRadius: 8,
                border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff',
                cursor: 'pointer', fontSize: 16, minHeight: 44,
              }}
            >🖼️ 変更</button>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', gap: 16, padding: 24 }}>
          <button
            onClick={() => cameraRef.current?.click()}
            style={{
              flex: 1, padding: '24px 16px', borderRadius: 12,
              border: `2px dashed ${COLORS.border}`,
              background: 'rgba(255,255,255,0.05)',
              color: '#fff', cursor: 'pointer', fontSize: 16,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              minHeight: 100,
            }}
          >
            <span style={{ fontSize: 36 }}>📷</span>
            カメラで撮影
          </button>
          <button
            onClick={() => albumRef.current?.click()}
            style={{
              flex: 1, padding: '24px 16px', borderRadius: 12,
              border: `2px dashed ${COLORS.border}`,
              background: 'rgba(255,255,255,0.05)',
              color: '#fff', cursor: 'pointer', fontSize: 16,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              minHeight: 100,
            }}
          >
            <span style={{ fontSize: 36 }}>🖼️</span>
            アルバムから選択
          </button>
        </div>
      )}
    </div>
  );
}

export function AddScreen({ records, tags, onDone }) {
  const [mode,       setMode]       = useState('veggie');
  const [imageFile,  setImageFile]  = useState(null);   // veggie用
  const [imageFiles, setImageFiles] = useState([]);     // bed/diary用
  const [date,       setDate]       = useState(toLocalDate());
  const [time,       setTime]       = useState(toLocalTime());
  const [comment,    setComment]    = useState('');
  const [text,       setText]       = useState('');     // diary用
  const [selTags,    setSelTags]    = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState(null);

  const cameraRef = useRef();
  const albumRef  = useRef();

  const bedVeggieMap = tags.bedVeggieMap ?? {};
  const veggieTags   = tags.tags.野菜 ?? [];
  const placeTags    = tags.tags.場所 ?? [];

  // モード変更時にリセット
  useEffect(() => {
    setImageFile(null);
    setImageFiles([]);
    setSelTags([]);
    setComment('');
    setText('');
    setError(null);
  }, [mode]);

  // ─── タグトグル（自動連携あり） ───
  const toggleTag = useCallback((tag) => {
    setSelTags((prev) => {
      const isSelected = prev.includes(tag);
      let next = isSelected ? prev.filter((t) => t !== tag) : [...prev, tag];

      if (!isSelected) {
        if (mode === 'veggie' && veggieTags.includes(tag)) {
          // 野菜を選択 → 対応する畝を自動ON
          for (const [bed, veggies] of Object.entries(bedVeggieMap)) {
            if (veggies.includes(tag) && !next.includes(bed)) {
              next.push(bed);
            }
          }
        } else if (mode === 'bed' && placeTags.includes(tag)) {
          // 畝を選択 → 対応する野菜を自動ON
          const linked = bedVeggieMap[tag] ?? [];
          for (const v of linked) {
            if (!next.includes(v)) next.push(v);
          }
        }
      }

      return next;
    });
  }, [mode, veggieTags, placeTags, bedVeggieMap]);

  // ─── bed/diary 複数画像操作 ───
  const addImageFiles = (files) => {
    setImageFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const removeImageFile = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── 保存 ───
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (mode === 'diary') {
        console.log('[handleSave] diary 保存開始 imageFiles:', imageFiles.length, '枚', imageFiles.map((f) => `${f.name}(${f.size}bytes)`));
        await records.add({
          category: 'diary',
          date, time,
          imageFiles,
          text,
        });
      } else if (mode === 'bed') {
        console.log('[handleSave] bed 保存開始 imageFiles:', imageFiles.length, '枚', imageFiles.map((f) => `${f.name}(${f.size}bytes)`));
        await records.add({
          category: 'bed',
          date, time,
          imageFiles,
          comment,
          tags: selTags,
        });
      } else {
        console.log('[handleSave] veggie 保存開始 imageFile:', imageFile ? `${imageFile.name}(${imageFile.size}bytes)` : 'なし');
        await records.add({
          category: 'veggie',
          date, time,
          imageFile: imageFile || null,
          comment,
          tags: selTags,
        });
      }
      console.log('[handleSave] 保存完了');
      onDone();
    } catch (e) {
      console.error('[handleSave] 保存エラー:', e);
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const modeBg = mode === 'diary' ? COLORS.diaryBg : mode === 'bed' ? COLORS.bedBg : COLORS.card;

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

      {/* モード切替（3択） */}
      <div style={{
        display: 'flex',
        padding: '10px 12px',
        gap: 6,
        background: COLORS.card,
        borderBottom: `1px solid ${COLORS.border}`,
        flexShrink: 0,
      }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            style={{
              flex: 1,
              padding: '10px 4px',
              borderRadius: 10,
              border: `2px solid ${mode === m.id ? COLORS.primary : COLORS.border}`,
              background: mode === m.id ? COLORS.primaryLight : COLORS.card,
              color: mode === m.id ? COLORS.primary : COLORS.textLight,
              fontSize: 15,
              fontWeight: mode === m.id ? 700 : 400,
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              minHeight: 56,
            }}
          >
            <span style={{ fontSize: 20 }}>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: modeBg }}>
        {/* 写真エリア */}
        {mode === 'veggie' ? (
          <SingleImagePreview
            imageFile={imageFile}
            cameraRef={cameraRef}
            albumRef={albumRef}
          />
        ) : (
          <MultiImagePreview
            files={imageFiles}
            onRemove={removeImageFile}
            cameraRef={cameraRef}
            albumRef={albumRef}
          />
        )}

        {/* hidden file inputs */}
        <input
          ref={cameraRef}
          type="file" accept="image/*" capture="environment"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (mode === 'veggie') setImageFile(file);
            else addImageFiles([file]);
            e.target.value = '';
            const dt = await getDateTimeFromFile(file);
            if (dt) { setDate(dt.date); setTime(dt.time); }
          }}
        />
        <input
          ref={albumRef}
          type="file" accept="image/*" multiple
          style={{ display: 'none' }}
          onChange={async (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            if (mode === 'veggie') setImageFile(files[0]);
            else addImageFiles(files);
            e.target.value = '';
            const dt = await getDateTimeFromFile(files[0]);
            if (dt) { setDate(dt.date); setTime(dt.time); }
          }}
        />

        {/* フォーム */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {error && (
            <div style={{
              padding: 12, borderRadius: 8, background: '#FEE', color: '#C00', fontSize: 16,
            }}>エラー: {error}</div>
          )}

          {/* 日付・時刻 */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, color: COLORS.textLight, marginBottom: 6 }}>日付</div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%', padding: '12px', borderRadius: 8,
                  border: `1px solid ${COLORS.border}`, fontSize: 18,
                  background: COLORS.card, color: COLORS.text, boxSizing: 'border-box',
                  minHeight: 56,
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, color: COLORS.textLight, marginBottom: 6 }}>時刻</div>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{
                  width: '100%', padding: '12px', borderRadius: 8,
                  border: `1px solid ${COLORS.border}`, fontSize: 18,
                  background: COLORS.card, color: COLORS.text, boxSizing: 'border-box',
                  minHeight: 56,
                }}
              />
            </div>
          </div>

          {/* 活動日記: テキストエリア（大） */}
          {mode === 'diary' && (
            <div>
              <div style={{ fontSize: 16, color: COLORS.textLight, marginBottom: 6 }}>
                日記（最大500字）
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 500))}
                placeholder="今日の作業や気づきを自由に書いてください…"
                rows={8}
                style={{
                  width: '100%', padding: '12px', borderRadius: 8,
                  border: `1px solid ${COLORS.border}`, fontSize: 18,
                  background: COLORS.card, color: COLORS.text,
                  resize: 'vertical', boxSizing: 'border-box',
                  lineHeight: 1.7,
                }}
              />
              <div style={{
                textAlign: 'right', fontSize: 14, color: COLORS.textLight, marginTop: 4,
              }}>{text.length} / 500</div>
            </div>
          )}

          {/* 野菜記録・畝の記録: タグ選択 */}
          {mode !== 'diary' && (
            <div>
              <div style={{ fontSize: 16, color: COLORS.textLight, marginBottom: 8 }}>
                タグ（複数選択可）
                {mode === 'veggie' && (
                  <span style={{ fontSize: 14, color: COLORS.primary, marginLeft: 8 }}>
                    野菜を選ぶと対応畝が自動ON
                  </span>
                )}
                {mode === 'bed' && (
                  <span style={{ fontSize: 14, color: COLORS.primary, marginLeft: 8 }}>
                    畝を選ぶと対応野菜が自動ON
                  </span>
                )}
              </div>
              {tags.loading ? (
                <div style={{ color: COLORS.textLight, fontSize: 16 }}>読み込み中…</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {Object.entries(tags.tags).map(([cat, tagList]) => (
                    <div key={cat}>
                      <div style={{ fontSize: 16, color: COLORS.textLight, marginBottom: 6, fontWeight: 600 }}>
                        {cat}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {tagList.map((tag) => {
                          const selected = selTags.includes(tag);
                          const isAutoLinked =
                            (mode === 'veggie' && placeTags.includes(tag) && selected) ||
                            (mode === 'bed' && veggieTags.includes(tag) && selected);
                          return (
                            <button
                              key={tag}
                              onClick={() => toggleTag(tag)}
                              style={{
                                padding: '10px 16px', borderRadius: 20,
                                border: `2px solid ${selected ? COLORS.primary : COLORS.border}`,
                                background: selected ? COLORS.primaryLight : COLORS.card,
                                color: selected ? COLORS.tagText : COLORS.text,
                                fontSize: 16, cursor: 'pointer',
                                minHeight: 56,
                                fontWeight: selected ? 700 : 400,
                                position: 'relative',
                              }}
                            >
                              {tag}
                              {isAutoLinked && (
                                <span style={{
                                  position: 'absolute', top: -4, right: -4,
                                  fontSize: 12, background: COLORS.accent,
                                  color: '#fff', borderRadius: '50%',
                                  width: 16, height: 16,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>A</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* コメント（野菜記録・畝の記録） */}
          {mode !== 'diary' && (
            <div>
              <div style={{ fontSize: 16, color: COLORS.textLight, marginBottom: 6 }}>コメント</div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="気づきや作業内容を入力…"
                rows={3}
                style={{
                  width: '100%', padding: '12px', borderRadius: 8,
                  border: `1px solid ${COLORS.border}`, fontSize: 18,
                  background: COLORS.card, color: COLORS.text,
                  resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            </div>
          )}
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
            width: '100%', padding: '16px', borderRadius: 8,
            border: 'none', background: COLORS.primary,
            color: '#fff', fontSize: 18, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
            minHeight: 56,
          }}
        >{saving ? '保存中…' : '保存する'}</button>
      </div>
    </div>
  );
}
