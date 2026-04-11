// src/components/TagScreen.jsx
import { useState, useEffect } from 'react';

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

function RecordThumb({ record, size = 80 }) {
  const [url, setUrl] = useState(null);
  const blob = (record.category ?? 'veggie') === 'veggie'
    ? record.imageBlob
    : (record.images ?? [])[0] ?? null;

  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  const icon = (record.category ?? 'veggie') === 'diary' ? '📔'
             : (record.category === 'bed') ? '🌱' : '🥬';

  return (
    <div style={{
      width: size, height: size, borderRadius: 8, overflow: 'hidden',
      background: '#E5E0D8', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {url
        ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: 24 }}>{icon}</span>
      }
    </div>
  );
}

function CompareCard({ record }) {
  const blob = (record.category ?? 'veggie') === 'veggie'
    ? record.imageBlob
    : (record.images ?? [])[0] ?? null;

  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  const cat  = record.category ?? 'veggie';
  const icon = cat === 'diary' ? '📔' : cat === 'bed' ? '🌱' : '🥬';
  const text = record.text || record.comment || '';

  return (
    <div style={{
      marginBottom: 10,
      background: COLORS.card,
      borderRadius: 10,
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}>
      {/* サムネイル */}
      <div style={{
        width: '100%', paddingTop: '75%', position: 'relative',
        background: '#E5E0D8',
      }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {url
            ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 28 }}>{icon}</span>
          }
        </div>
        <span style={{ position: 'absolute', top: 4, left: 4, fontSize: 14, lineHeight: 1 }}>
          {icon}
        </span>
      </div>

      {/* テキスト情報 */}
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: 14, color: COLORS.textLight, marginBottom: 4 }}>
          {record.date}
        </div>
        {text && (
          <div style={{
            fontSize: 16, color: COLORS.text, lineHeight: 1.4,
            marginBottom: 6,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {text}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(record.tags ?? []).slice(0, 3).map((tag) => (
            <span key={tag} style={{
              fontSize: 12, padding: '2px 7px', borderRadius: 20,
              background: COLORS.tagBg, color: COLORS.tagText,
            }}>{tag}</span>
          ))}
          {(record.tags ?? []).length > 3 && (
            <span style={{ fontSize: 12, color: COLORS.textLight }}>
              +{record.tags.length - 3}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function RecordItem({ record }) {
  const text = record.text || record.comment || '';
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      background: COLORS.card, borderRadius: 10,
      padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    }}>
      <RecordThumb record={record} size={72} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, color: COLORS.textLight }}>
          {record.date}{record.time ? ` ${record.time}` : ''}
        </div>
        {text && (
          <div style={{
            fontSize: 18, color: COLORS.text, marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{text}</div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          {(record.tags ?? []).map((tag) => (
            <span key={tag} style={{
              fontSize: 16, padding: '3px 8px', borderRadius: 20,
              background: COLORS.tagBg, color: COLORS.tagText,
            }}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TagScreen({ records, tags }) {
  const [mode,         setMode]         = useState('timeline');
  const [selectedTag,  setSelectedTag]  = useState('');
  const [monthFilter,  setMonthFilter]  = useState('');
  const [leftYear,     setLeftYear]     = useState('');
  const [rightYear,    setRightYear]    = useState('');

  const allTags = tags.allTagsFlat ?? [];

  useEffect(() => {
    if (allTags.length > 0 && !selectedTag) {
      setSelectedTag(allTags[0]);
    }
  }, [allTags, selectedTag]);

  // タグで絞り込んだ記録（アーカイブ除外）— 時系列・年比較の共通データソース
  const tagRecords = selectedTag
    ? records.records.filter((r) => !r.archived && (r.tags ?? []).includes(selectedTag))
    : [];

  // 月フィルター用：存在する年月 'YYYY-MM' 一覧
  const months = [...new Set(tagRecords.map((r) => r.date?.slice(0, 7)).filter(Boolean))].sort();

  // 時系列フィルター（monthFilter は 'YYYY-MM' 形式）
  const timelineRecords = monthFilter
    ? tagRecords.filter((r) => r.date?.startsWith(monthFilter))
    : tagRecords;

  // ── 年比較：tagRecords を年ごとにグループ化（byYear は常に tagRecords と一致）
  const byYear = tagRecords.reduce((acc, r) => {
    const year = r.date ? r.date.slice(0, 4) : '不明';
    if (!acc[year]) acc[year] = [];
    acc[year].push(r);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort();

  // 年選択を初期化・更新（選択中の年が現在のbyYearに存在しない場合もリセット）
  useEffect(() => {
    if (years.length > 0) {
      setLeftYear((prev) => years.includes(prev) ? prev : years[years.length - 1]);
    } else {
      setLeftYear('');
    }
    if (years.length > 1) {
      setRightYear((prev) => years.includes(prev) ? prev : years[years.length - 2]);
    } else {
      setRightYear('');
    }
  }, [years.join(',')]); // eslint-disable-line

  // 年比較の月フィルター用：存在する月 'MM' 一覧（全年共通）
  const compareMonths = [...new Set(tagRecords.map((r) => r.date?.slice(5, 7)).filter(Boolean))].sort();

  // compareFilter：monthFilter は 'YYYY-MM' or 'MM' どちらにも対応
  const compareFilter = (recs) => {
    if (!monthFilter) return recs;
    // 'YYYY-MM' 形式 → 末尾2桁に変換、'MM' 形式はそのまま
    const mm = monthFilter.length === 7 ? monthFilter.slice(5, 7) : monthFilter;
    return recs.filter((r) => r.date?.slice(5, 7) === mm);
  };

  // byYear はすでに !archived 済みの tagRecords から作成しているので再フィルター不要
  const leftRecords  = compareFilter(byYear[leftYear]  ?? []);
  const rightRecords = compareFilter(byYear[rightYear] ?? []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ヘッダー（固定） */}
      <div style={{
        padding: '14px 16px 10px',
        background: COLORS.card,
        borderBottom: `1px solid ${COLORS.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>タグで見る</span>
      </div>

      {/* スクロールエリア：タグ選択 + モード切替（sticky）+ コンテンツ */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* タグ選択（スクロール内） */}
        <div style={{
          padding: '10px 16px',
          background: COLORS.card,
          borderBottom: `1px solid ${COLORS.border}`,
        }}>
          <div style={{ fontSize: 16, color: COLORS.textLight, marginBottom: 8 }}>タグを選択</div>
          {tags.loading ? (
            <div style={{ color: COLORS.textLight, fontSize: 16 }}>読み込み中…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(tags.tags).map(([cat, tagList]) => (
                <div key={cat}>
                  <div style={{ fontSize: 14, color: COLORS.textLight, marginBottom: 4 }}>{cat}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {tagList.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => { setSelectedTag(tag); setMonthFilter(''); }}
                        style={{
                          padding: '6px 12px', borderRadius: 20, minHeight: 44,
                          border: `2px solid ${selectedTag === tag ? COLORS.primary : COLORS.border}`,
                          background: selectedTag === tag ? COLORS.primaryLight : COLORS.card,
                          color: selectedTag === tag ? COLORS.tagText : COLORS.text,
                          fontSize: 16, cursor: 'pointer',
                          fontWeight: selectedTag === tag ? 700 : 400,
                        }}
                      >{tag}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* モード切替（sticky：スクロールしても常に見える） */}
        <div style={{
          display: 'flex', padding: '8px 16px', gap: 8,
          background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`,
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          {(['timeline', 'compare']).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1, padding: '10px', borderRadius: 8, minHeight: 48,
                border: `1px solid ${mode === m ? COLORS.primary : COLORS.border}`,
                background: mode === m ? COLORS.primaryLight : COLORS.card,
                color: mode === m ? COLORS.primary : COLORS.textLight,
                fontSize: 16, cursor: 'pointer', fontWeight: mode === m ? 700 : 400,
              }}
            >{m === 'timeline' ? '時系列' : '年比較'}</button>
          ))}
        </div>

        {/* コンテンツ */}
        <div style={{ padding: 12 }}>
        {!selectedTag ? (
          <div style={{ textAlign: 'center', color: COLORS.textLight, padding: 40, fontSize: 16 }}>
            タグを選択してください
          </div>
        ) : mode === 'timeline' ? (
          <>
            {months.length > 1 && (
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
                <button
                  onClick={() => setMonthFilter('')}
                  style={{
                    flexShrink: 0, padding: '6px 12px', borderRadius: 20, fontSize: 16, minHeight: 44,
                    border: `1px solid ${!monthFilter ? COLORS.primary : COLORS.border}`,
                    background: !monthFilter ? COLORS.primaryLight : COLORS.card,
                    color: !monthFilter ? COLORS.tagText : COLORS.textLight, cursor: 'pointer',
                  }}
                >すべて</button>
                {months.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMonthFilter(m)}
                    style={{
                      flexShrink: 0, padding: '6px 12px', borderRadius: 20, fontSize: 16, minHeight: 44,
                      border: `1px solid ${monthFilter === m ? COLORS.primary : COLORS.border}`,
                      background: monthFilter === m ? COLORS.primaryLight : COLORS.card,
                      color: monthFilter === m ? COLORS.tagText : COLORS.textLight, cursor: 'pointer',
                    }}
                  >{m}</button>
                ))}
              </div>
            )}
            {timelineRecords.length === 0 ? (
              <div style={{ textAlign: 'center', color: COLORS.textLight, padding: 40, fontSize: 16 }}>
                記録がありません
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {timelineRecords.map((r) => <RecordItem key={r.id} record={r} />)}
              </div>
            )}
          </>
        ) : (
          <>
            {/* 年比較モード */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <select
                value={leftYear}
                onChange={(e) => setLeftYear(e.target.value)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8, minHeight: 48,
                  border: `1px solid ${COLORS.border}`, fontSize: 16,
                  background: COLORS.card, color: COLORS.text,
                }}
              >
                <option value="">年を選択</option>
                {years.map((y) => <option key={y} value={y}>{y}年</option>)}
              </select>
              <select
                value={rightYear}
                onChange={(e) => setRightYear(e.target.value)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8, minHeight: 48,
                  border: `1px solid ${COLORS.border}`, fontSize: 16,
                  background: COLORS.card, color: COLORS.text,
                }}
              >
                <option value="">年を選択</option>
                {years.map((y) => <option key={y} value={y}>{y}年</option>)}
              </select>
            </div>

            {compareMonths.length > 0 && (
              <div style={{
                display: 'flex', gap: 8, overflowX: 'auto',
                paddingBottom: 10, scrollbarWidth: 'none',
                marginBottom: 4,
              }}>
                <button
                  onClick={() => setMonthFilter('')}
                  style={{
                    flexShrink: 0,
                    padding: '0 18px', height: 56, borderRadius: 28,
                    fontSize: 16, cursor: 'pointer',
                    border: `2px solid ${!monthFilter ? COLORS.primary : COLORS.border}`,
                    background: !monthFilter ? COLORS.primaryLight : COLORS.card,
                    color: !monthFilter ? COLORS.tagText : COLORS.textLight,
                    fontWeight: !monthFilter ? 700 : 400,
                    whiteSpace: 'nowrap',
                  }}
                >すべて</button>
                {compareMonths.map((mm) => {
                  const active = monthFilter === mm;
                  return (
                    <button
                      key={mm}
                      onClick={() => setMonthFilter(active ? '' : mm)}
                      style={{
                        flexShrink: 0,
                        padding: '0 16px', height: 56, borderRadius: 28,
                        fontSize: 16, cursor: 'pointer',
                        border: `2px solid ${active ? COLORS.primary : COLORS.border}`,
                        background: active ? COLORS.primaryLight : COLORS.card,
                        color: active ? COLORS.tagText : COLORS.textLight,
                        fontWeight: active ? 700 : 400,
                        whiteSpace: 'nowrap',
                      }}
                    >{Number(mm)}月</button>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary, marginBottom: 8, textAlign: 'center' }}>
                  {leftYear ? `${leftYear}年` : '—'}
                </div>
                {leftRecords.length === 0
                  ? <div style={{ fontSize: 16, color: COLORS.textLight, textAlign: 'center' }}>記録なし</div>
                  : leftRecords.map((r) => <CompareCard key={r.id} record={r} />)
                }
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary, marginBottom: 8, textAlign: 'center' }}>
                  {rightYear ? `${rightYear}年` : '—'}
                </div>
                {rightRecords.length === 0
                  ? <div style={{ fontSize: 16, color: COLORS.textLight, textAlign: 'center' }}>記録なし</div>
                  : rightRecords.map((r) => <CompareCard key={r.id} record={r} />)
                }
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
