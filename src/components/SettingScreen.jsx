// src/components/SettingScreen.jsx
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
  red:          '#E05C5C',
  tagBg:        '#E8F0E9',
  tagText:      '#3A6B47',
};

const APP_VERSION = '1.0.0';

async function buildBackupZip(records, tags) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // data.json（imageBlob以外）
  const dataMeta = records.map(({ imageBlob, ...rest }) => rest);
  zip.file('data.json', JSON.stringify(dataMeta, null, 2));

  // tags.json
  zip.file('tags.json', JSON.stringify(tags, null, 2));

  // 画像ファイル
  const imagesFolder = zip.folder('images');
  for (const r of records) {
    if (r.imageBlob) {
      const arrayBuf = await r.imageBlob.arrayBuffer();
      imagesFolder.file(`${r.id}.jpg`, arrayBuf);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  return blob;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function SettingScreen({ tags, records }) {
  const [newTagInputs, setNewTagInputs] = useState({}); // { [category]: string }
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
        {/* ─── タグ管理 ─── */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>
            🏷️ タグ管理
          </div>

          {tags.loading ? (
            <div style={{ color: COLORS.textLight }}>読み込み中…</div>
          ) : (
            <>
              {Object.entries(tags.tags).map(([category, tagList]) => (
                <div key={category} style={{
                  background: COLORS.card, borderRadius: 12,
                  border: `1px solid ${COLORS.border}`, padding: 12,
                  marginBottom: 12,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.primary, marginBottom: 8 }}>
                    {category}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {tagList.map((tag) => (
                      <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 20,
                          background: COLORS.tagBg, color: COLORS.tagText, fontSize: 13,
                        }}>{tag}</span>
                        <button
                          onClick={() => handleRemoveTag(category, tag)}
                          style={{
                            width: 20, height: 20, borderRadius: '50%',
                            border: 'none', background: COLORS.red,
                            color: '#fff', fontSize: 11, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, padding: 0,
                          }}
                        >✕</button>
                      </div>
                    ))}
                    {tagList.length === 0 && (
                      <span style={{ color: COLORS.textLight, fontSize: 13 }}>タグなし</span>
                    )}
                  </div>
                  {/* タグ追加 */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      placeholder="タグを追加…"
                      value={newTagInputs[category] ?? ''}
                      onChange={(e) => setNewTagInputs((prev) => ({ ...prev, [category]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(category); }}
                      style={{
                        flex: 1, padding: '8px 10px', borderRadius: 8,
                        border: `1px solid ${COLORS.border}`, fontSize: 14,
                        background: COLORS.bg, color: COLORS.text, outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => handleAddTag(category)}
                      style={{
                        padding: '8px 14px', borderRadius: 8,
                        border: 'none', background: COLORS.primary,
                        color: '#fff', fontSize: 14, cursor: 'pointer', flexShrink: 0,
                      }}
                    >追加</button>
                  </div>
                </div>
              ))}

              {/* 新規カテゴリ追加 */}
              <div style={{
                background: COLORS.card, borderRadius: 12,
                border: `1px dashed ${COLORS.border}`, padding: 12,
              }}>
                <div style={{ fontSize: 13, color: COLORS.textLight, marginBottom: 8 }}>
                  新しいカテゴリを追加
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    placeholder="カテゴリ名…"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                    style={{
                      flex: 1, padding: '8px 10px', borderRadius: 8,
                      border: `1px solid ${COLORS.border}`, fontSize: 14,
                      background: COLORS.bg, color: COLORS.text, outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleAddCategory}
                    style={{
                      padding: '8px 14px', borderRadius: 8,
                      border: 'none', background: COLORS.primary,
                      color: '#fff', fontSize: 14, cursor: 'pointer', flexShrink: 0,
                    }}
                  >追加</button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ─── バックアップ ─── */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>
            💾 バックアップ
          </div>
          <div style={{
            background: COLORS.card, borderRadius: 12,
            border: `1px solid ${COLORS.border}`, padding: 16,
          }}>
            <p style={{ fontSize: 14, color: COLORS.textLight, marginTop: 0, marginBottom: 12 }}>
              全記録と画像をZIPファイルにまとめてダウンロードします。
            </p>
            {backupError && (
              <div style={{ padding: 8, borderRadius: 8, background: '#FEE', color: '#C00', fontSize: 14, marginBottom: 8 }}>
                エラー: {backupError}
              </div>
            )}
            {backupMsg && (
              <div style={{ padding: 8, borderRadius: 8, background: COLORS.primaryLight, color: COLORS.primary, fontSize: 14, marginBottom: 8 }}>
                {backupMsg}
              </div>
            )}
            <button
              onClick={handleBackup}
              disabled={backingUp}
              style={{
                width: '100%', padding: '12px', borderRadius: 8,
                border: 'none', background: COLORS.accent,
                color: '#fff', fontSize: 15, fontWeight: 600,
                cursor: backingUp ? 'not-allowed' : 'pointer',
                opacity: backingUp ? 0.6 : 1,
              }}
            >
              {backingUp ? '準備中…' : 'バックアップをダウンロード'}
            </button>
            <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 8 }}>
              記録数: {records.records.length}件
            </div>
          </div>
        </section>

        {/* ─── アプリ情報 ─── */}
        <section>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>
            ℹ️ アプリ情報
          </div>
          <div style={{
            background: COLORS.card, borderRadius: 12,
            border: `1px solid ${COLORS.border}`, padding: 16,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: COLORS.textLight }}>アプリ名</span>
              <span style={{ fontSize: 14, color: COLORS.text, fontWeight: 600 }}>自給菜園ノート</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: COLORS.textLight }}>バージョン</span>
              <span style={{ fontSize: 14, color: COLORS.text }}>{APP_VERSION}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: COLORS.textLight }}>作者</span>
              <span style={{ fontSize: 14, color: COLORS.text }}>waka-hiro-60</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
