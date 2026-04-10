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
  useEffect(() => {
    if (!record.imageBlob) return;
    const u = URL.createObjectURL(record.imageBlob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [record.imageBlob]);

  return (
    <div style={{
      width: size, height: size, borderRadius: 8, overflow: 'hidden',
      background: '#E5E0D8', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {url
        ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: 20 }}>🌿</span>
      }
    </div>
  );
}

function CompareThumb({ record }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!record.imageBlob) return;
    const u = URL.createObjectURL(record.imageBlob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [record.imageBlob]);

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        width: '100%', paddingTop: '100%', position: 'relative',
        borderRadius: 8, overflow: 'hidden', background: '#E5E0D8',
      }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {url
            ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 20 }}>🌿</span>
          }
        </div>
      </div>
      <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 2 }}>{record.date}</div>
    </div>
  );
}

function RecordItem({ record }) {
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      background: COLORS.card, borderRadius: 10,
      padding: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    }}>
      <RecordThumb record={record} size={72} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: COLORS.textLight }}>
          {record.date}{record.time ? ` ${record.time}` : ''}
        </div>
        {record.comment && (
          <div style={{
            fontSize: 14, color: COLORS.text, marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{record.comment}</div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {(record.tags ?? []).map((tag) => (
            <span key={tag} style={{
              fontSize: 11, padding: '2px 6px', borderRadius: 20,
              background: COLORS.tagBg, color: COLORS.tagText,
            }}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TagScreen({ records, tags }) {
  const [mode, setMode]           = useState('timeline'); // 'timeline' | 'compare'
  const [selectedTag, setSelectedTag] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [leftYear, setLeftYear]   = useState('');
  const [rightYear, setRightYear] = useState('');

  const allTags = tags.allTagsFlat ?? [];

  // 初期タグ選択
  useEffect(() => {
    if (allTags.length > 0 && !selectedTag) {
      setSelectedTag(allTags[0]);
    }
  }, [allTags, selectedTag]);

  // タグで絞った記録
  const tagRecords = selectedTag
    ? records.records.filter((r) => !r.archived && r.tags.includes(selectedTag))
    : [];

  // 月フィルター用: 存在する年月のリスト
  const months = [...new Set(tagRecords.map((r) => r.date?.slice(0, 7)).filter(Boolean))].sort();

  // 時系列
  const timelineRecords = monthFilter
    ? tagRecords.filter((r) => r.date?.startsWith(monthFilter))
    : tagRecords;

  // 年比較用
  const byYear = records.getByTagGroupedByYear(selectedTag);
  const years  = Object.keys(byYear).sort();

  useEffect(() => {
    if (years.length > 0 && !leftYear)  setLeftYear(years[years.length - 1] ?? '');
    if (years.length > 1 && !rightYear) setRightYear(years[years.length - 2] ?? '');
  }, [years.join(',')]); // eslint-disable-line

  const compareFilter = (recs) => monthFilter
    ? recs.filter((r) => r.date?.slice(5, 7) === monthFilter.slice(5, 7))
    : recs;

  const leftRecords  = compareFilter((byYear[leftYear]  ?? []).filter((r) => !r.archived));
  const rightRecords = compareFilter((byYear[rightYear] ?? []).filter((r) => !r.archived));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ヘッダー */}
      <div style={{
        padding: '14px 16px 10px',
        background: COLORS.card,
        borderBottom: `1px solid ${COLORS.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>タグで見る</span>
      </div>

      {/* タグ選択 */}
      <div style={{
        padding: '10px 16px',
        background: COLORS.card,
        borderBottom: `1px solid ${COLORS.border}`,
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 13, color: COLORS.textLight, marginBottom: 6 }}>タグを選択</div>
        {tags.loading ? (
          <div style={{ color: COLORS.textLight, fontSize: 14 }}>読み込み中…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(tags.tags).map(([cat, tagList]) => (
              <div key={cat}>
                <div style={{ fontSize: 12, color: COLORS.textLight, marginBottom: 4 }}>{cat}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tagList.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => { setSelectedTag(tag); setMonthFilter(''); }}
                      style={{
                        padding: '5px 10px', borderRadius: 20,
                        border: `1px solid ${selectedTag === tag ? COLORS.primary : COLORS.border}`,
                        background: selectedTag === tag ? COLORS.primaryLight : COLORS.card,
                        color: selectedTag === tag ? COLORS.tagText : COLORS.text,
                        fontSize: 13, cursor: 'pointer',
                      }}
                    >{tag}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* モード切替 */}
      <div style={{
        display: 'flex', padding: '8px 16px', gap: 8,
        background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`,
        flexShrink: 0,
      }}>
        {(['timeline', 'compare']).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1, padding: '8px', borderRadius: 8,
              border: `1px solid ${mode === m ? COLORS.primary : COLORS.border}`,
              background: mode === m ? COLORS.primaryLight : COLORS.card,
              color: mode === m ? COLORS.primary : COLORS.textLight,
              fontSize: 14, cursor: 'pointer', fontWeight: mode === m ? 600 : 400,
            }}
          >{m === 'timeline' ? '時系列' : '年比較'}</button>
        ))}
      </div>

      {/* コンテンツ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {!selectedTag ? (
          <div style={{ textAlign: 'center', color: COLORS.textLight, padding: 40 }}>
            タグを選択してください
          </div>
        ) : mode === 'timeline' ? (
          <>
            {/* 月フィルター */}
            {months.length > 1 && (
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
                <button
                  onClick={() => setMonthFilter('')}
                  style={{
                    flexShrink: 0, padding: '5px 10px', borderRadius: 20, fontSize: 13,
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
                      flexShrink: 0, padding: '5px 10px', borderRadius: 20, fontSize: 13,
                      border: `1px solid ${monthFilter === m ? COLORS.primary : COLORS.border}`,
                      background: monthFilter === m ? COLORS.primaryLight : COLORS.card,
                      color: monthFilter === m ? COLORS.tagText : COLORS.textLight, cursor: 'pointer',
                    }}
                  >{m}</button>
                ))}
              </div>
            )}
            {timelineRecords.length === 0 ? (
              <div style={{ textAlign: 'center', color: COLORS.textLight, padding: 40 }}>
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
                  flex: 1, padding: '8px', borderRadius: 8,
                  border: `1px solid ${COLORS.border}`, fontSize: 14,
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
                  flex: 1, padding: '8px', borderRadius: 8,
                  border: `1px solid ${COLORS.border}`, fontSize: 14,
                  background: COLORS.card, color: COLORS.text,
                }}
              >
                <option value="">年を選択</option>
                {years.map((y) => <option key={y} value={y}>{y}年</option>)}
              </select>
            </div>

            {/* 月フィルター（共通） */}
            {months.length > 1 && (
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
                <button
                  onClick={() => setMonthFilter('')}
                  style={{
                    flexShrink: 0, padding: '5px 10px', borderRadius: 20, fontSize: 13,
                    border: `1px solid ${!monthFilter ? COLORS.primary : COLORS.border}`,
                    background: !monthFilter ? COLORS.primaryLight : COLORS.card,
                    color: !monthFilter ? COLORS.tagText : COLORS.textLight, cursor: 'pointer',
                  }}
                >すべて</button>
                {[...new Set(tagRecords.map((r) => r.date?.slice(5, 7)).filter(Boolean))].sort().map((m) => (
                  <button
                    key={m}
                    onClick={() => setMonthFilter(m)}
                    style={{
                      flexShrink: 0, padding: '5px 10px', borderRadius: 20, fontSize: 13,
                      border: `1px solid ${monthFilter === m ? COLORS.primary : COLORS.border}`,
                      background: monthFilter === m ? COLORS.primaryLight : COLORS.card,
                      color: monthFilter === m ? COLORS.tagText : COLORS.textLight, cursor: 'pointer',
                    }}
                  >{m}月</button>
                ))}
              </div>
            )}

            {/* 2列比較 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.primary, marginBottom: 8, textAlign: 'center' }}>
                  {leftYear ? `${leftYear}年` : '—'}
                </div>
                {leftRecords.length === 0
                  ? <div style={{ fontSize: 13, color: COLORS.textLight, textAlign: 'center' }}>記録なし</div>
                  : leftRecords.map((r) => (
                    <CompareThumb key={r.id} record={r} />
                  ))
                }
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.primary, marginBottom: 8, textAlign: 'center' }}>
                  {rightYear ? `${rightYear}年` : '—'}
                </div>
                {rightRecords.length === 0
                  ? <div style={{ fontSize: 13, color: COLORS.textLight, textAlign: 'center' }}>記録なし</div>
                  : rightRecords.map((r) => (
                    <CompareThumb key={r.id} record={r} />
                  ))
                }
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
