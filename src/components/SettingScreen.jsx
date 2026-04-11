// src/components/SettingScreen.jsx
import { useState, useCallback } from 'react';

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
  bedBg:        '#F0F5F0',
};

const APP_VERSION = '1.0.0';

async function buildBackupZip(records, tags) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  const dataMeta = records.map(({ imageBlob, images, ...rest }) => rest);
  zip.file('data.json', JSON.stringify(dataMeta, null, 2));
  zip.file('tags.json', JSON.stringify(tags, null, 2));

  const imagesFolder = zip.folder('images');
  for (const r of records) {
    if (r.imageBlob) {
      const buf = await r.imageBlob.arrayBuffer();
      imagesFolder.file(`${r.id}.jpg`, buf);
    }
    if (r.images) {
      for (let i = 0; i < r.images.length; i++) {
        const buf = await r.images[i].arrayBuffer();
        imagesFolder.file(`${r.id}_${i}.jpg`, buf);
      }
    }
  }

  return zip.generateAsync({ type: 'blob' });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────
// 畝↔野菜マッピングUI
// ─────────────────────────────────────────

function BedVeggieMapSection({ tags }) {
  const bedList    = tags.tags.場所 ?? [];
  const veggieList = tags.tags.野菜 ?? [];
  const map        = tags.bedVeggieMap ?? {};

  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState('');

  const toggleVeggieForBed = async (bed, veggie) => {
    const current = map[bed] ?? [];
    const updated = current.includes(veggie)
      ? current.filter((v) => v !== veggie)
      : [...current, veggie];
    const newMap = { ...map, [bed]: updated };
    setSaving(true);
    try {
      await tags.updateBedVeggieMap(newMap);
      setMsg('保存しました');
      setTimeout(() => setMsg(''), 1500);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (bedList.length === 0) {
    return (
      <div style={{ color: COLORS.textLight, fontSize: 16, padding: 8 }}>
        「場所」タグに畝を追加してから設定できます
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {msg && (
        <div style={{
          padding: 10, borderRadius: 8,
          background: COLORS.primaryLight, color: COLORS.primary,
          fontSize: 16,
        }}>{msg}</div>
      )}
      {bedList.map((bed) => {
        const linked = map[bed] ?? [];
        return (
          <div key={bed} style={{
            background: COLORS.bedBg, borderRadius: 12,
            border: `1px solid #D0E4D0`, padding: 14,
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.primary, marginBottom: 10 }}>
              🌱 {bed}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {veggieList.map((veggie) => {
                const selected = linked.includes(veggie);
                return (
                  <button
                    key={veggie}
                    onClick={() => toggleVeggieForBed(bed, veggie)}
                    disabled={saving}
                    style={{
                      padding: '8px 14px', borderRadius: 20, minHeight: 44,
                      border: `2px solid ${selected ? COLORS.primary : COLORS.border}`,
                      background: selected ? COLORS.primaryLight : COLORS.card,
                      color: selected ? COLORS.tagText : COLORS.text,
                      fontSize: 16, cursor: 'pointer',
                      fontWeight: selected ? 700 : 400,
                    }}
                  >
                    {veggie}
                  </button>
                );
              })}
              {veggieList.length === 0 && (
                <span style={{ color: COLORS.textLight, fontSize: 16 }}>
                  「野菜」タグを追加してください
                </span>
              )}
            </div>
            {linked.length > 0 && (
              <div style={{ fontSize: 16, color: COLORS.primary, marginTop: 10 }}>
                現在: {linked.join('、')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────
// SettingScreen
// ─────────────────────────────────────────

export function SettingScreen({ tags, records }) {
  const [newTagInputs, setNewTagInputs] = useState({});
  const [newCategory,  setNewCategory]  = useState('');
  const [backingUp,    setBackingUp]    = useState(false);
  const [backupError,  setBackupError]  = useState(null);
  const [backupMsg,    setBackupMsg]    = useState('');

  const handleAddTag = async (category) => {
    const tag = (newTagInputs[category] ?? '').trim();
    if (!tag) return;
    try {
      await tags.add(category, tag);
      setNewTagInputs((prev) => ({ ...prev, [category]: '' }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveTag = async (category, tag) => {
    try {
      await tags.remove(category, tag);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCategory = async () => {
    const cat = newCategory.trim();
    if (!cat) return;
    try {
      await tags.addCategory(cat);
      setNewCategory('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    setBackupError(null);
    setBackupMsg('');
    try {
      const blob = await buildBackupZip(records.records, tags.tags);
      const now  = new Date();
      const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      downloadBlob(blob, `saien-note-backup-${yyyymmdd}.zip`);
      setBackupMsg('バックアップをダウンロードしました');
    } catch (e) {
      console.error(e);
      setBackupError(e.message);
    } finally {
      setBackingUp(false);
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
        <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>設定</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* ─── 畝と野菜の対応設定 ─── */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>
            🌱 畝と野菜の対応設定
          </div>
          <div style={{
            background: COLORS.card, borderRadius: 12,
            border: `1px solid ${COLORS.border}`, padding: 14,
            marginBottom: 8,
          }}>
            <p style={{ fontSize: 16, color: COLORS.textLight, margin: '0 0 12px' }}>
              各畝に植えている野菜を設定すると、記録追加時に自動でタグが連携されます。
            </p>
            {tags.loading ? (
              <div style={{ color: COLORS.textLight, fontSize: 16 }}>読み込み中…</div>
            ) : (
              <BedVeggieMapSection tags={tags} />
            )}
          </div>
        </section>

        {/* ─── タグ管理 ─── */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>
            🏷️ タグ管理
          </div>

          {tags.loading ? (
            <div style={{ color: COLORS.textLight, fontSize: 16 }}>読み込み中…</div>
          ) : (
            <>
              {Object.entries(tags.tags).map(([category, tagList]) => (
                <div key={category} style={{
                  background: COLORS.card, borderRadius: 12,
                  border: `1px solid ${COLORS.border}`, padding: 14,
                  marginBottom: 12,
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary, marginBottom: 10 }}>
                    {category}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {tagList.map((tag) => (
                      <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{
                          padding: '6px 12px', borderRadius: 20,
                          background: COLORS.tagBg, color: COLORS.tagText, fontSize: 16,
                        }}>{tag}</span>
                        <button
                          onClick={() => handleRemoveTag(category, tag)}
                          style={{
                            width: 28, height: 28, borderRadius: '50%',
                            border: 'none', background: COLORS.red,
                            color: '#fff', fontSize: 14, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, padding: 0,
                          }}
                        >✕</button>
                      </div>
                    ))}
                    {tagList.length === 0 && (
                      <span style={{ color: COLORS.textLight, fontSize: 16 }}>タグなし</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="タグを追加…"
                      value={newTagInputs[category] ?? ''}
                      onChange={(e) => setNewTagInputs((prev) => ({ ...prev, [category]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(category); }}
                      style={{
                        flex: 1, padding: '10px 12px', borderRadius: 8,
                        border: `1px solid ${COLORS.border}`, fontSize: 16,
                        background: COLORS.bg, color: COLORS.text, outline: 'none',
                        minHeight: 48,
                      }}
                    />
                    <button
                      onClick={() => handleAddTag(category)}
                      style={{
                        padding: '10px 18px', borderRadius: 8,
                        border: 'none', background: COLORS.primary,
                        color: '#fff', fontSize: 16, cursor: 'pointer', flexShrink: 0,
                        minHeight: 48,
                      }}
                    >追加</button>
                  </div>
                </div>
              ))}

              {/* 新規カテゴリ追加 */}
              <div style={{
                background: COLORS.card, borderRadius: 12,
                border: `1px dashed ${COLORS.border}`, padding: 14,
              }}>
                <div style={{ fontSize: 16, color: COLORS.textLight, marginBottom: 8 }}>
                  新しいカテゴリを追加
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="カテゴリ名…"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: 8,
                      border: `1px solid ${COLORS.border}`, fontSize: 16,
                      background: COLORS.bg, color: COLORS.text, outline: 'none',
                      minHeight: 48,
                    }}
                  />
                  <button
                    onClick={handleAddCategory}
                    style={{
                      padding: '10px 18px', borderRadius: 8,
                      border: 'none', background: COLORS.primary,
                      color: '#fff', fontSize: 16, cursor: 'pointer', flexShrink: 0,
                      minHeight: 48,
                    }}
                  >追加</button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ─── バックアップ ─── */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>
            💾 バックアップ
          </div>
          <div style={{
            background: COLORS.card, borderRadius: 12,
            border: `1px solid ${COLORS.border}`, padding: 16,
          }}>
            <p style={{ fontSize: 16, color: COLORS.textLight, marginTop: 0, marginBottom: 12 }}>
              全記録と画像をZIPファイルにまとめてダウンロードします。
            </p>
            {backupError && (
              <div style={{ padding: 10, borderRadius: 8, background: '#FEE', color: '#C00', fontSize: 16, marginBottom: 8 }}>
                エラー: {backupError}
              </div>
            )}
            {backupMsg && (
              <div style={{ padding: 10, borderRadius: 8, background: COLORS.primaryLight, color: COLORS.primary, fontSize: 16, marginBottom: 8 }}>
                {backupMsg}
              </div>
            )}
            <button
              onClick={handleBackup}
              disabled={backingUp}
              style={{
                width: '100%', padding: '14px', borderRadius: 8, minHeight: 56,
                border: 'none', background: COLORS.accent,
                color: '#fff', fontSize: 17, fontWeight: 600,
                cursor: backingUp ? 'not-allowed' : 'pointer',
                opacity: backingUp ? 0.6 : 1,
              }}
            >
              {backingUp ? '準備中…' : 'バックアップをダウンロード'}
            </button>
            <div style={{ fontSize: 16, color: COLORS.textLight, marginTop: 8 }}>
              記録数: {records.records.length}件
            </div>
          </div>
        </section>

        {/* ─── アプリ情報 ─── */}
        <section>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>
            ℹ️ アプリ情報
          </div>
          <div style={{
            background: COLORS.card, borderRadius: 12,
            border: `1px solid ${COLORS.border}`, padding: 16,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {[
              ['アプリ名',   '自給菜園ノート'],
              ['バージョン', APP_VERSION],
              ['作者',       '時代進'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 16, color: COLORS.textLight }}>{label}</span>
                <span style={{ fontSize: 16, color: COLORS.text, fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
