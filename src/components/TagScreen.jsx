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
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {src
            ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 28 }}>{icon}</span>
          }
        </div>
        <span style={{ position: 'absolute', top: 4, left: 4, fontSize: 14, lineHeight: 1 }}>{icon}</span>
        {(record.imageBase64s ?? []).length >= 2 && (
          <div style={{
            position: 'absolute', bottom: 4, right: 4,
            background: 'rgba(0,0,0,0.55)', color: '#fff',
            fontSize: 11, borderRadius: 4, padding: '1px 5px', lineHeight: 1.4,
          }}>📷{record.imageBase64s.length}</div>
        )}
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: 14, color: COLORS.textLight, marginBottom: 4 }}>
          {record.date}{record.time ? ` ${record.time}` : ''}
        </div>
        {text && (
          <div style={{
            fontSize: 15, color: COLORS.text, lineHeight: 1.4, marginBottom: 6,
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

// ─── TagScreen（年比較専用） ───
export function TagScreen({ records, tags }) {
  const [selectedTag, setSelectedTag] = useState('');
  const [leftYear,    setLeftYear]    = useState('');
  const [rightYear,   setRightYear]   = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  // 選択タグの記録（アーカイブ除外）
  const tagRecords = selectedTag
    ? records.records.filter((r) => !r.archived && (r.tags ?? []).includes(selectedTag))
    : [];

  // 年ごとにグループ化
  const byYear = tagRecords.reduce((acc, r) => {
    const year = r.date ? r.date.slice(0, 4) : '不明';
    if (!acc[year]) acc[year] = [];
    acc[year].push(r);
    return acc;
  }, {});

  // 選択可能な年：記録のある年 ＋ 現在年から過去4年を合わせてソート
  const currentYear = new Date().getFullYear();
  const recordYears = Object.keys(byYear);
  const rangeYears  = Array.from({ length: 4 }, (_, i) => String(currentYear - i));
  const selectableYears = [...new Set([...recordYears, ...rangeYears])].sort((a, b) => b.localeCompare(a));

  // タグが変わったら年・月フィルターをリセット
  useEffect(() => {
    setLeftYear(selectableYears[0] ?? '');
    setRightYear(selectableYears[1] ?? '');
    setMonthFilter('');
  }, [selectedTag]); // eslint-disable-line

  // 月フィルター用：全年共通の月（MM）一覧
  const compareMonths = [...new Set(tagRecords.map((r) => r.date?.slice(5, 7)).filter(Boolean))].sort();

  const filterByMonth = (recs) => {
    if (!monthFilter) return recs;
    return recs.filter((r) => r.date?.slice(5, 7) === monthFilter);
  };

  const leftRecords  = filterByMonth(byYear[leftYear]  ?? []);
  const rightRecords = filterByMonth(byYear[rightYear] ?? []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ヘッダー */}
      <div style={{
        padding: '14px 16px 10px',
        background: COLORS.card,
        borderBottom: `1px solid ${COLORS.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>年別比較</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Step1: タグ選択 */}
        <div style={{
          padding: '12px 16px',
          background: COLORS.card,
          borderBottom: `1px solid ${COLORS.border}`,
        }}>
          <div style={{ fontSize: 15, color: COLORS.textLight, marginBottom: 8, fontWeight: 600 }}>
            ① タグを選ぶ
          </div>
          {tags.loading ? (
            <div style={{ color: COLORS.textLight, fontSize: 16 }}>読み込み中…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(tags.tags).map(([cat, tagList]) => (
                <div key={cat}>
                  <div style={{ fontSize: 13, color: COLORS.textLight, marginBottom: 4 }}>{cat}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {tagList.map((tag) => {
                      const active = selectedTag === tag;
                      return (
                        <button
                          key={tag}
                          onClick={() => setSelectedTag((prev) => prev === tag ? '' : tag)}
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

        {/* タグ未選択 */}
        {!selectedTag && (
          <div style={{ textAlign: 'center', color: COLORS.textLight, padding: 48, fontSize: 16 }}>
            タグを選ぶと年別に比較できます
          </div>
        )}

        {/* タグ選択済み */}
        {selectedTag && (
          <div style={{ padding: 12 }}>

            {/* Step2: 年を選ぶ */}
            <div style={{ fontSize: 15, color: COLORS.textLight, marginBottom: 8, fontWeight: 600 }}>
              ② 比べる年を選ぶ
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
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
                {selectableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}年{byYear[y] ? ` (${byYear[y].length}件)` : ' (記録なし)'}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 16, color: COLORS.textLight, flexShrink: 0 }}>vs</div>
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
                {selectableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}年{byYear[y] ? ` (${byYear[y].length}件)` : ' (記録なし)'}
                  </option>
                ))}
              </select>
            </div>

            {/* 月フィルター（記録がある月だけ表示） */}
            {compareMonths.length > 1 && (
              <>
                <div style={{ fontSize: 15, color: COLORS.textLight, marginBottom: 8, fontWeight: 600 }}>
                  月で絞り込む（任意）
                </div>
                <div style={{
                  display: 'flex', gap: 6, overflowX: 'auto',
                  paddingBottom: 10, scrollbarWidth: 'none', marginBottom: 12,
                }}>
                  <button
                    onClick={() => setMonthFilter('')}
                    style={{
                      flexShrink: 0, padding: '6px 14px', borderRadius: 20, minHeight: 44,
                      border: `2px solid ${!monthFilter ? COLORS.primary : COLORS.border}`,
                      background: !monthFilter ? COLORS.primaryLight : COLORS.card,
                      color: !monthFilter ? COLORS.tagText : COLORS.textLight,
                      fontSize: 16, cursor: 'pointer', fontWeight: !monthFilter ? 700 : 400,
                    }}
                  >すべて</button>
                  {compareMonths.map((mm) => {
                    const active = monthFilter === mm;
                    return (
                      <button
                        key={mm}
                        onClick={() => setMonthFilter(active ? '' : mm)}
                        style={{
                          flexShrink: 0, padding: '6px 14px', borderRadius: 20, minHeight: 44,
                          border: `2px solid ${active ? COLORS.primary : COLORS.border}`,
                          background: active ? COLORS.primaryLight : COLORS.card,
                          color: active ? COLORS.tagText : COLORS.textLight,
                          fontSize: 16, cursor: 'pointer', fontWeight: active ? 700 : 400,
                        }}
                      >{Number(mm)}月</button>
                    );
                  })}
                </div>
              </>
            )}

            {/* 比較グリッド */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {/* 左列 */}
              <div>
                <div style={{
                  fontSize: 16, fontWeight: 700, color: COLORS.primary,
                  marginBottom: 8, textAlign: 'center',
                  padding: '6px 0', borderBottom: `2px solid ${COLORS.primary}`,
                }}>
                  {leftYear ? `${leftYear}年` : '—'}
                </div>
                {!leftYear ? null : leftRecords.length === 0 ? (
                  <div style={{ fontSize: 15, color: COLORS.textLight, textAlign: 'center', paddingTop: 20 }}>
                    記録なし
                  </div>
                ) : (
                  leftRecords.map((r) => <CompareCard key={r.id} record={r} />)
                )}
              </div>
              {/* 右列 */}
              <div>
                <div style={{
                  fontSize: 16, fontWeight: 700, color: COLORS.primary,
                  marginBottom: 8, textAlign: 'center',
                  padding: '6px 0', borderBottom: `2px solid ${COLORS.primary}`,
                }}>
                  {rightYear ? `${rightYear}年` : '—'}
                </div>
                {!rightYear ? null : rightRecords.length === 0 ? (
                  <div style={{ fontSize: 15, color: COLORS.textLight, textAlign: 'center', paddingTop: 20 }}>
                    記録なし
                  </div>
                ) : (
                  rightRecords.map((r) => <CompareCard key={r.id} record={r} />)
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
