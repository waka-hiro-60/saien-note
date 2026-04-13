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

// ─── サムネイル（Base64対応） ───
function RecordThumb({ record, size = 80 }) {
  const cat = record.category ?? 'veggie';
  const src = cat === 'veggie'
    ? (record.imageBase64 ?? null)
    : (record.imageBase64s ?? [])[0] ?? null;

  const icon = cat === 'diary' ? '📔' : cat === 'bed' ? '🌱' : '🥬';

  return (
    <div style={{
      width: size, height: size, borderRadius: 8, overflow: 'hidden',
      background: '#E5E0D8', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {src
        ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: 24 }}>{icon}</span>
      }
    </div>
  );
}

// ─── 年比較カード（Base64対応） ───
function CompareCard({ record }) {
  const cat = record.category ?? 'veggie';
  const src = cat === 'veggie'
    ? (record.imageBase64 ?? null)
    : (record.imageBase64s ?? [])[0] ?? null;

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
      <div style={{ width: '100%', paddingTop: '75%', position: 'relative', background: '#E5E0D8' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {src
            ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 28 }}>{icon}</span>
          }
        </div>
        <span style={{ position: 'absolute', top: 4, left: 4, fontSize: 14, lineHeight: 1 }}>{icon}</span>
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: 14, color: COLORS.textLight, marginBottom: 4 }}>{record.date}</div>
        {text && (
          <div style={{
            fontSize: 16, color: COLORS.text, lineHeight: 1.4, marginBottom: 6,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>{text}</div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(record.tags ?? []).slice(0, 3).map((tag) => (
            <span key={tag} style={{
              fontSize: 12, padding: '2px 7px', borderRadius: 20,
              background: COLORS.tagBg, color: COLORS.tagText,
            }}>{tag}</span>
          ))}
          {(record.tags ?? []).length > 3 && (
            <span style={{ fontSize: 12, color: COLORS.textLight }}>+{record.tags.length - 3}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 時系列レコード行 ───
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

// ─── TagScreen ───
export function TagScreen({ records, tags }) {
  const [mode,        setMode]        = useState('timeline');
  const [selectedTag, setSelectedTag] = useState('');   // ← 空文字で開始（auto-select廃止）
  const [monthFilter, setMonthFilter] = useState('');
  const [leftYear,    setLeftYear]    = useState('');
  const [rightYear,   setRightYear]   = useState('');

  // タグで絞り込んだ記録（アーカイブ除外）
  const tagRecords = selectedTag
    ? records.records.filter((r) => !r.archived && (r.tags ?? []).includes(selectedTag))
    : [];

  // 月フィルター用：存在する年月 'YYYY-MM' 一覧
  const months = [...new Set(tagRecords.map((r) => r.date?.slice(0, 7)).filter(Boolean))].sort();

  // 時系列（monthFilterは 'YYYY-MM' 形式）
  const timelineRecords = monthFilter
    ? tagRecords.filter((r) => r.date?.startsWith(monthFilter))
    : tagRecords;

  // 年比較：tagRecordsを年ごとにグループ化
  const byYear = tagRecords.reduce((acc, r) => {
    const year = r.date ? r.date.slice(0, 4) : '不明';
    if (!acc[year]) acc[year] = [];
    acc[year].push(r);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort();

  // 選択タグが変わったとき年選択をリセット
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

  // 年比較の月フィルター（MM形式）
  const compareMonths = [...new Set(tagRecords.map((r) => r.date?.slice(5, 7)).filter(Boolean))].sort();

  const compareFilter = (recs) => {
    if (!monthFilter) return recs;
    const mm = monthFilter.length === 7 ? monthFilter.slice(5, 7) : monthFilter;
    return recs.filter((r) => r.date?.slice(5, 7) === mm);
  };

  const leftRecords  = compareFilter(byYear[leftYear]  ?? []);
  const rightRecords = compareFilter(byYear[rightYear] ?? []);

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

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* タグ選択 */}
        <div style={{
          padding: '10px 16px',
          background: COLORS.card,
          borderBottom: `1px solid ${COLORS.border}`,
        }}>
          <div style={{ fontSize: 16, color: COLORS.textLight, marginBottom: 8 }}>
            タグを選択（1つ）
          </div>
          {tags.loading ? (
            <div style={{ color: COLORS.textLight, fontSize: 16 }}>読み込み中…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(tags.tags).map(([cat, tagList]) => (
                <div key={cat}>
                  <div style={{ fontSize: 14, color: COLORS.textLight, marginBottom: 4 }}>{cat}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {tagList.map((tag) => {
                      const active = selectedTag === tag;
                      return (
                        <button
                          key={tag}
                          onClick={() => {
                            // 同じタグをタップで選択解除
                            setSelectedTag((prev) => prev === tag ? '' : tag);
                            setMonthFilter('');
                          }}
                          style={{
                            padding: '6px 12px', borderRadius: 20, minHeight: 44,
                            border: `2px solid ${active ? COLORS.primary : COLORS.border}`,
                            background: active ? COLORS.primaryLight : COLORS.card,
                            color: active ? COLORS.tagText : COLORS.text,
                            fontSize: 16, cursor: 'pointer',
                            fontWeight: active ? 700 : 400,
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

        {/* モード切替（sticky） */}
        {selectedTag && (
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
        )}

        {/* コンテンツ */}
        <div style={{ padding: 12 }}>
          {!selectedTag ? (
            <div style={{ textAlign: 'center', color: COLORS.textLight, padding: 40, fontSize: 16 }}>
              上のタグをタップして記録を見る
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
                <select value={leftYear} onChange={(e) => setLeftYear(e.target.value)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8, minHeight: 48,
                    border: `1px solid ${COLORS.border}`, fontSize: 16,
                    background: COLORS.card, color: COLORS.text,
                  }}>
                  <option value="">年を選択</option>
                  {years.map((y) => <option key={y} value={y}>{y}年</option>)}
                </select>
                <select value={rightYear} onChange={(e) => setRightYear(e.target.value)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8, minHeight: 48,
                    border: `1px solid ${COLORS.border}`, fontSize: 16,
                    background: COLORS.card, color: COLORS.text,
                  }}>
                  <option value="">年を選択</option>
                  {years.map((y) => <option key={y} value={y}>{y}年</option>)}
                </select>
              </div>

              {compareMonths.length > 0 && (
                <div style={{
                  display: 'flex', gap: 8, overflowX: 'auto',
                  paddingBottom: 10, scrollbarWidth: 'none', marginBottom: 4,
                }}>
                  <button onClick={() => setMonthFilter('')} style={{
                    flexShrink: 0, padding: '0 18px', height: 56, borderRadius: 28,
                    fontSize: 16, cursor: 'pointer',
                    border: `2px solid ${!monthFilter ? COLORS.primary : COLORS.border}`,
                    background: !monthFilter ? COLORS.primaryLight : COLORS.card,
                    color: !monthFilter ? COLORS.tagText : COLORS.textLight,
                    fontWeight: !monthFilter ? 700 : 400, whiteSpace: 'nowrap',
                  }}>すべて</button>
                  {compareMonths.map((mm) => {
                    const active = monthFilter === mm;
                    return (
                      <button key={mm} onClick={() => setMonthFilter(active ? '' : mm)} style={{
                        flexShrink: 0, padding: '0 16px', height: 56, borderRadius: 28,
                        fontSize: 16, cursor: 'pointer',
                        border: `2px solid ${active ? COLORS.primary : COLORS.border}`,
                        background: active ? COLORS.primaryLight : COLORS.card,
                        color: active ? COLORS.tagText : COLORS.textLight,
                        fontWeight: active ? 700 : 400, whiteSpace: 'nowrap',
                      }}>{Number(mm)}月</button>
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
