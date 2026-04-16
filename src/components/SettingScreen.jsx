// src/components/SettingScreen.jsx
import { useState, useCallback, useRef } from 'react';
import { set } from 'idb-keyval';
import { recordsStore, deleteRecord, saveTags, saveBedVeggieMap } from '../utils/db';

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

const APP_VERSION = '1.1.0';

// ─────────────────────────────────────────
// バックアップZIP作成
// bedVeggieMap も含めて保存する
// ─────────────────────────────────────────
async function buildBackupZip(records, tags, bedVeggieMap) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  zip.file('data.json', JSON.stringify(records, null, 2));
  zip.file('tags.json', JSON.stringify({ tags, bedVeggieMap }, null, 2));

  return zip.generateAsync({ type: 'blob' });
}

// ─────────────────────────────────────────
// ZIPから復元
// 新形式（{tags, bedVeggieMap}）と旧形式（タグのみ）の両方に対応
// ─────────────────────────────────────────
async function parseBackupZip(zipFile) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(zipFile);

  const dataJson = await zip.file('data.json')?.async('string');
  if (!dataJson) throw new Error('data.json が見つかりません。正しいバックアップファイルか確認してください。');
  const records = JSON.parse(dataJson);

  const tagsJson = await zip.file('tags.json')?.async('string');
  if (!tagsJson) throw new Error('tags.json が見つかりません。正しいバックアップファイルか確認してください。');
  const tagsData = JSON.parse(tagsJson);

  // 新形式: { tags: {...}, bedVeggieMap: {...} }
  // 旧形式: { 野菜: [...], 状態: [...], ... }
  const tags        = tagsData.tags        ?? tagsData;
  const bedVeggieMap = tagsData.bedVeggieMap ?? {};

  return { records, tags, bedVeggieMap };
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
// 公開設定（APIキー）セクション
// ─────────────────────────────────────────

function ApiKeySection({ settings }) {
  const [input,   setInput]   = useState('');
  const [show,    setShow]    = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState('');

  const hasKey = !!settings.apiKey;

  const handleSave = async () => {
    if (!input.trim()) return;
    setSaving(true);
    try {
      await settings.saveKey(input.trim());
      setInput('');
      setMsg('APIキーを保存しました。公開タブが表示されます。');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('APIキーを削除します。公開タブが非表示になります。')) return;
    await settings.clearKey();
    setMsg('APIキーを削除しました。');
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div style={{
      background: COLORS.card, borderRadius: 12,
      border: `1px solid ${COLORS.border}`, padding: 16,
    }}>
      <p style={{ fontSize: 16, color: COLORS.textLight, margin: '0 0 12px' }}>
        APIキーを入力すると公開タブが表示されます。このアプリの管理者のみ設定してください。
      </p>

      {msg && (
        <div style={{
          padding: 10, borderRadius: 8, fontSize: 16, marginBottom: 12,
          background: COLORS.primaryLight, color: COLORS.primary,
        }}>{msg}</div>
      )}

      {hasKey ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <span style={{ fontSize: 16, color: COLORS.primary, fontWeight: 600 }}>APIキー設定済み</span>
          </div>
          <button
            onClick={handleClear}
            style={{
              padding: '8px 14px', borderRadius: 8, minHeight: 44,
              border: `1px solid ${COLORS.red}`,
              background: '#fff', color: COLORS.red,
              fontSize: 16, cursor: 'pointer',
            }}
          >削除</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type={show ? 'text' : 'password'}
              placeholder="APIキーを入力…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 8,
                border: `1px solid ${COLORS.border}`, fontSize: 16,
                background: COLORS.bg, color: COLORS.text, outline: 'none',
                minHeight: 48,
              }}
            />
            <button
              onClick={() => setShow((v) => !v)}
              style={{
                padding: '10px 14px', borderRadius: 8, minHeight: 48,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.card, color: COLORS.textLight,
                fontSize: 18, cursor: 'pointer', flexShrink: 0,
              }}
            >{show ? '🙈' : '👁'}</button>
          </div>
          <button
            onClick={handleSave}
            disabled={!input.trim() || saving}
            style={{
              width: '100%', padding: '14px', borderRadius: 8, minHeight: 56,
              border: 'none', background: COLORS.primary,
              color: '#fff', fontSize: 17, fontWeight: 600,
              cursor: (!input.trim() || saving) ? 'not-allowed' : 'pointer',
              opacity: (!input.trim() || saving) ? 0.5 : 1,
            }}
          >{saving ? '保存中…' : 'APIキーを保存'}</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// SettingScreen
// ─────────────────────────────────────────

export function SettingScreen({ tags, records, settings }) {
  const [newTagInputs, setNewTagInputs] = useState({});
  const [newCategory,  setNewCategory]  = useState('');

  // バックアップ
  const [backingUp,   setBackingUp]   = useState(false);
  const [backupError, setBackupError] = useState(null);
  const [backupMsg,   setBackupMsg]   = useState('');

  // 復元
  const [restoring,    setRestoring]    = useState(false);
  const [restoreError, setRestoreError] = useState(null);
  const [restoreMsg,   setRestoreMsg]   = useState('');
  const restoreInputRef = useRef(null);

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

  // ─── バックアップ（bedVeggieMap も含む）───
  const handleBackup = async () => {
    setBackingUp(true);
    setBackupError(null);
    setBackupMsg('');
    try {
      const blob = await buildBackupZip(
        records.records,
        tags.tags,
        tags.bedVeggieMap,
      );
      const now      = new Date();
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

  // ─── 復元 ───
  const handleRestoreFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!window.confirm(
      `「${file.name}」から復元します。\n現在のデータはすべて削除されます。\nよろしいですか？`
    )) return;

    setRestoring(true);
    setRestoreError(null);
    setRestoreMsg('');

    try {
      const { records: newRecords, tags: newTags, bedVeggieMap: newMap } =
        await parseBackupZip(file);

      // 既存レコードを全削除
      for (const r of records.records) {
        await deleteRecord(r.id);
      }

      // 新しいレコードを追加（元のIDと日時を保持したまま保存）
      for (const r of newRecords) {
        await set(r.id, r, recordsStore);
      }

      // タグ・マッピングを上書き保存
      await saveTags(newTags);
      await saveBedVeggieMap(newMap);

      setRestoreMsg(`✅ ${newRecords.length}件の記録を復元しました。画面を更新します…`);

      // 1.5秒後にリロード
      setTimeout(() => window.location.reload(), 1500);

    } catch (e) {
      console.error(e);
      setRestoreError(e.message);
    } finally {
      setRestoring(false);
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

        {/* ─── 公開設定 ─── */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>
            🔑 公開設定
          </div>
          {settings.loading ? (
            <div style={{ color: COLORS.textLight, fontSize: 16 }}>読み込み中…</div>
          ) : (
            <ApiKeySection settings={settings} />
          )}
        </section>

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

        {/* ─── バックアップ・復元 ─── */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>
            💾 バックアップ・復元
          </div>
          <div style={{
            background: COLORS.card, borderRadius: 12,
            border: `1px solid ${COLORS.border}`, padding: 16,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>

            {/* バックアップ */}
            <div>
              <p style={{ fontSize: 16, color: COLORS.textLight, marginTop: 0, marginBottom: 8 }}>
                全記録・タグ・畝設定をZIPファイルにまとめてダウンロードします。
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
                {backingUp ? '準備中…' : '📥 バックアップをダウンロード'}
              </button>
              <div style={{ fontSize: 16, color: COLORS.textLight, marginTop: 6 }}>
                記録数: {records.records.length}件
              </div>
            </div>

            {/* 区切り */}
            <div style={{ borderTop: `1px solid ${COLORS.border}` }} />

            {/* 復元 */}
            <div>
              <p style={{ fontSize: 16, color: COLORS.textLight, marginTop: 0, marginBottom: 8 }}>
                バックアップZIPから記録を復元します。現在のデータは削除されます。
              </p>
              {restoreError && (
                <div style={{ padding: 10, borderRadius: 8, background: '#FEE', color: '#C00', fontSize: 16, marginBottom: 8 }}>
                  エラー: {restoreError}
                </div>
              )}
              {restoreMsg && (
                <div style={{ padding: 10, borderRadius: 8, background: COLORS.primaryLight, color: COLORS.primary, fontSize: 16, marginBottom: 8 }}>
                  {restoreMsg}
                </div>
              )}
              <input
                ref={restoreInputRef}
                type="file"
                accept=".zip"
                style={{ display: 'none' }}
                onChange={handleRestoreFileChange}
              />
              <button
                onClick={() => restoreInputRef.current?.click()}
                disabled={restoring}
                style={{
                  width: '100%', padding: '14px', borderRadius: 8, minHeight: 56,
                  border: `2px solid ${COLORS.red}`,
                  background: '#fff', color: COLORS.red,
                  fontSize: 17, fontWeight: 600,
                  cursor: restoring ? 'not-allowed' : 'pointer',
                  opacity: restoring ? 0.6 : 1,
                }}
              >
                {restoring ? '復元中…' : '📤 バックアップから復元'}
              </button>
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
