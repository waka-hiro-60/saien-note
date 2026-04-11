// src/components/HomeScreen.jsx
import { useState, useEffect, useMemo } from 'react';
import { DetailScreen } from './DetailScreen';

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
// ユーティリティ
// ─────────────────────────────────────────

function formatDateHeader(dateStr) {
  if (!dateStr || dateStr === '日付不明') return '日付不明';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${y}年${m}月${d}日（${days[date.getDay()]}）`;
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-').map(Number);
  return `${m}/${d}`;
}

function getCategoryOrder(category) {
  if (category === 'diary') return 0;
  if (category === 'bed')   return 1;
  return 2; // veggie
}

// 記録のサムネイルBlobを返す（veggie: imageBlob、bed/diary: images[0]）
function getThumbBlob(record) {
  if ((record.category ?? 'veggie') === 'veggie') return record.imageBlob;
  return (record.images ?? [])[0] ?? null;
}

// ─────────────────────────────────────────
// 画像コンポーネント
// ─────────────────────────────────────────

function RecordImage({ blob, placeholder = '🌿', style = {} }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  if (!url) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#E5E0D8', color: COLORS.textLight, fontSize: 28,
        ...style,
      }}>{placeholder}</div>
    );
  }
  return <img src={url} alt="記録" style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }} />;
}

// ─────────────────────────────────────────
// 野菜カード
// ─────────────────────────────────────────

function VeggieListCard({ record, onTap }) {
  const thumb = getThumbBlob(record);
  return (
    <div
      onClick={() => onTap(record)}
      style={{
        background: COLORS.card,
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        display: 'flex',
        minHeight: 80,
      }}
    >
      <div style={{ width: 80, height: 80, flexShrink: 0, position: 'relative' }}>
        <RecordImage blob={thumb} placeholder="🥬" />
        <span style={{
          position: 'absolute', top: 4, left: 4,
          fontSize: 16, lineHeight: 1,
        }}>🥬</span>
      </div>
      <div style={{ flex: 1, padding: '10px 12px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 16, color: COLORS.textLight }}>{record.date}</span>
          {record.published && (
            <span style={{
              background: COLORS.accent, color: '#fff',
              fontSize: 11, padding: '2px 6px', borderRadius: 8, fontWeight: 600,
            }}>公開</span>
          )}
        </div>
        {record.comment && (
          <div style={{
            fontSize: 18, color: COLORS.text, lineHeight: 1.5,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: 4,
          }}>{record.comment}</div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(record.tags ?? []).slice(0, 3).map((tag) => (
            <span key={tag} style={{
              fontSize: 16, padding: '3px 8px', borderRadius: 20,
              background: COLORS.tagBg, color: COLORS.tagText,
            }}>{tag}</span>
          ))}
          {(record.tags ?? []).length > 3 && (
            <span style={{ fontSize: 16, color: COLORS.textLight }}>+{record.tags.length - 3}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 畝カード
// ─────────────────────────────────────────

function BedListCard({ record, onTap, veggieTags = [] }) {
  const thumb = getThumbBlob(record);
  const associatedVeggies = (record.tags ?? []).filter((t) => veggieTags.includes(t));
  const otherTags         = (record.tags ?? []).filter((t) => !veggieTags.includes(t));

  return (
    <div
      onClick={() => onTap(record)}
      style={{
        background: COLORS.bedBg,
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        display: 'flex',
        minHeight: 80,
        border: `1px solid #D0E4D0`,
      }}
    >
      <div style={{ width: 80, height: 80, flexShrink: 0, position: 'relative' }}>
        <RecordImage blob={thumb} placeholder="🌱" />
        <span style={{
          position: 'absolute', top: 4, left: 4,
          fontSize: 16, lineHeight: 1,
        }}>🌱</span>
      </div>
      <div style={{ flex: 1, padding: '10px 12px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 16, color: COLORS.textLight }}>{record.date}</span>
        </div>
        {record.comment && (
          <div style={{
            fontSize: 18, color: COLORS.text, lineHeight: 1.5,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: 4,
          }}>{record.comment}</div>
        )}
        {associatedVeggies.length > 0 && (
          <div style={{ fontSize: 16, color: COLORS.primary, marginBottom: 4 }}>
            {associatedVeggies.join('・')}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {otherTags.slice(0, 3).map((tag) => (
            <span key={tag} style={{
              fontSize: 16, padding: '3px 8px', borderRadius: 20,
              background: '#D0E4D0', color: COLORS.primary,
            }}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 日記カード
// ─────────────────────────────────────────

function DiaryListCard({ record, onTap }) {
  const thumb = getThumbBlob(record);
  return (
    <div
      onClick={() => onTap(record)}
      style={{
        background: COLORS.diaryBg,
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        display: 'flex',
        minHeight: 80,
        border: `1px solid #F0DFC0`,
      }}
    >
      <div style={{ width: 80, height: 80, flexShrink: 0, position: 'relative' }}>
        {thumb ? (
          <RecordImage blob={thumb} placeholder="📔" />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#F0DFC0', fontSize: 32,
          }}>📔</div>
        )}
        <span style={{
          position: 'absolute', top: 4, left: 4,
          fontSize: 16, lineHeight: 1,
        }}>📔</span>
      </div>
      <div style={{ flex: 1, padding: '10px 12px', minWidth: 0 }}>
        <div style={{ fontSize: 16, color: COLORS.textLight, marginBottom: 4 }}>{record.date}</div>
        {record.text && (
          <div style={{
            fontSize: 18, color: COLORS.text, lineHeight: 1.6,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>{record.text}</div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// グリッドカード（全カテゴリ共通）
// ─────────────────────────────────────────

function GridCard({ record, onTap }) {
  const thumb = getThumbBlob(record);
  const cat   = record.category ?? 'veggie';
  const icon  = cat === 'diary' ? '📔' : cat === 'bed' ? '🌱' : '🥬';
  const bg    = cat === 'diary' ? COLORS.diaryBg : cat === 'bed' ? COLORS.bedBg : COLORS.card;

  return (
    <div
      onClick={() => onTap(record)}
      style={{
        background: bg,
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ paddingTop: '100%', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          {thumb ? (
            <RecordImage blob={thumb} placeholder={icon} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: cat === 'diary' ? '#F0DFC0' : cat === 'bed' ? '#D0E4D0' : '#E5E0D8',
              fontSize: 36,
            }}>{icon}</div>
          )}
        </div>
        <span style={{
          position: 'absolute', top: 6, left: 6,
          fontSize: 18, lineHeight: 1,
        }}>{icon}</span>
        {record.published && (
          <div style={{
            position: 'absolute', top: 6, right: 6,
            background: COLORS.accent, color: '#fff',
            fontSize: 11, padding: '2px 6px', borderRadius: 10, fontWeight: 600,
          }}>公開</div>
        )}
      </div>
      <div style={{ padding: '8px' }}>
        <div style={{ fontSize: 16, color: COLORS.textLight, marginBottom: 4 }}>{record.date}</div>
        {cat === 'diary' ? (
          <div style={{
            fontSize: 16, color: COLORS.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{record.text || '—'}</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(record.tags ?? []).slice(0, 2).map((tag) => (
              <span key={tag} style={{
                fontSize: 13, padding: '2px 6px', borderRadius: 20,
                background: COLORS.tagBg, color: COLORS.tagText,
              }}>{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 「去年のこの頃」カード
// ─────────────────────────────────────────

function LastYearCard({ records, onShowAll }) {
  if (!records || records.length === 0) return null;

  const today    = new Date();
  const lastYear = today.getFullYear() - 1;
  const month    = today.getMonth() + 1;

  const preview = records.slice(0, 3);

  return (
    <div style={{
      background: '#FFFBF0',
      border: `1px solid ${COLORS.accent}`,
      borderRadius: 12,
      padding: '12px 14px',
      marginBottom: 12,
      boxShadow: '0 1px 4px rgba(200,169,110,0.15)',
    }}>
      <div style={{
        fontSize: 16, fontWeight: 700, color: COLORS.accent, marginBottom: 10,
      }}>
        🗓️ 去年のこの頃（{lastYear}年{month}月）
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {preview.map((r) => {
          const cat  = r.category ?? 'veggie';
          const icon = cat === 'diary' ? '📔' : cat === 'bed' ? '🌱' : '🥬';
          const text = r.text || r.comment || '';
          return (
            <div key={r.id} style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 16, color: COLORS.textLight, flexShrink: 0, minWidth: 40 }}>
                {formatShortDate(r.date)}
              </span>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{
                fontSize: 18, color: COLORS.text, lineHeight: 1.4,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                flex: 1,
              }}>
                {text.slice(0, 24) || (r.tags ?? []).join('・')}
              </span>
            </div>
          );
        })}
      </div>

      <button
        onClick={onShowAll}
        style={{
          marginTop: 10,
          padding: '10px 0',
          width: '100%',
          border: 'none',
          background: 'transparent',
          color: COLORS.accent,
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
          textAlign: 'right',
        }}
      >
        → 詳しく見る
      </button>
    </div>
  );
}

// ─────────────────────────────────────────
// HomeScreen
// ─────────────────────────────────────────

export function HomeScreen({ records, tags }) {
  const [viewMode,        setViewMode]        = useState('list');
  const [keyword,         setKeyword]         = useState('');
  const [selectedTags,    setSelectedTags]    = useState([]);
  const [showArchived,    setShowArchived]    = useState(false);
  const [selectedRecord,  setSelectedRecord]  = useState(null);
  const [showLastYear,    setShowLastYear]    = useState(false);

  const { loading, error, searchAndFilter, getRecordsInDateRange, reload } = records;

  // ─── 去年のこの頃 ───
  const lastYearRecords = useMemo(() => {
    const today  = new Date();
    const lYear  = today.getFullYear() - 1;
    const center = new Date(lYear, today.getMonth(), today.getDate());
    const start  = new Date(center); start.setDate(center.getDate() - 7);
    const end    = new Date(center); end.setDate(center.getDate() + 7);
    const fmt    = (d) => d.toISOString().slice(0, 10);
    return getRecordsInDateRange(fmt(start), fmt(end));
  }, [getRecordsInDateRange]);

  const lastYearStartDate = useMemo(() => {
    const today  = new Date();
    const lYear  = today.getFullYear() - 1;
    const center = new Date(lYear, today.getMonth(), today.getDate());
    const start  = new Date(center); start.setDate(center.getDate() - 7);
    return start.toISOString().slice(0, 10);
  }, []);

  const lastYearEndDate = useMemo(() => {
    const today  = new Date();
    const lYear  = today.getFullYear() - 1;
    const center = new Date(lYear, today.getMonth(), today.getDate());
    const end    = new Date(center); end.setDate(center.getDate() + 7);
    return end.toISOString().slice(0, 10);
  }, []);

  // ─── フィルタリング ───
  const filtered = useMemo(() => {
    let result = searchAndFilter(keyword, selectedTags);
    if (!showArchived) result = result.filter((r) => !r.archived);
    if (showLastYear) {
      result = result.filter((r) => r.date >= lastYearStartDate && r.date <= lastYearEndDate);
    }
    return result;
  }, [searchAndFilter, keyword, selectedTags, showArchived, showLastYear, lastYearStartDate, lastYearEndDate]);

  // ─── 日付グループ化 ───
  const groupedByDate = useMemo(() => {
    const groups = {};
    for (const r of filtered) {
      const date = r.date || '日付不明';
      if (!groups[date]) groups[date] = [];
      groups[date].push(r);
    }
    // 日付降順
    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    // 各日内でdiary→bed→veggieの順
    for (const date of sortedDates) {
      groups[date].sort((a, b) =>
        getCategoryOrder(a.category ?? 'veggie') - getCategoryOrder(b.category ?? 'veggie')
      );
    }
    return { groups, sortedDates };
  }, [filtered]);

  const toggleFilterTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const allTags    = tags.allTagsFlat ?? [];
  const veggieTags = tags.tags.野菜 ?? [];

  const renderCard = (r) => {
    const cat = r.category ?? 'veggie';
    if (viewMode === 'grid') return <GridCard key={r.id} record={r} onTap={setSelectedRecord} />;
    if (cat === 'diary') return <DiaryListCard key={r.id} record={r} onTap={setSelectedRecord} />;
    if (cat === 'bed')   return <BedListCard   key={r.id} record={r} onTap={setSelectedRecord} veggieTags={veggieTags} />;
    return <VeggieListCard key={r.id} record={r} onTap={setSelectedRecord} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 10px',
        background: COLORS.card,
        borderBottom: `1px solid ${COLORS.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.primary }}>
          🌱 自給菜園ノート
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setShowArchived((v) => !v)}
            style={{
              padding: '8px 12px', borderRadius: 8, minHeight: 44,
              border: `1px solid ${COLORS.border}`,
              background: showArchived ? COLORS.primaryLight : COLORS.card,
              color: showArchived ? COLORS.primary : COLORS.textLight,
              fontSize: 16, cursor: 'pointer',
            }}
          >📦</button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              width: 44, height: 44, borderRadius: 8, minHeight: 44,
              border: `1px solid ${COLORS.border}`,
              background: viewMode === 'list' ? COLORS.primaryLight : COLORS.card,
              color: viewMode === 'list' ? COLORS.primary : COLORS.textLight,
              cursor: 'pointer', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >☰</button>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              width: 44, height: 44, borderRadius: 8, minHeight: 44,
              border: `1px solid ${COLORS.border}`,
              background: viewMode === 'grid' ? COLORS.primaryLight : COLORS.card,
              color: viewMode === 'grid' ? COLORS.primary : COLORS.textLight,
              cursor: 'pointer', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >⊞</button>
        </div>
      </div>

      {/* 検索バー */}
      <div style={{
        padding: '8px 16px 0',
        background: COLORS.card,
        flexShrink: 0,
        borderBottom: `1px solid ${COLORS.border}`,
      }}>
        <input
          type="search"
          placeholder="キーワードで検索…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{
            width: '100%', padding: '12px', borderRadius: 8,
            border: `1px solid ${COLORS.border}`, fontSize: 18,
            background: COLORS.bg, color: COLORS.text,
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        {allTags.length > 0 && (
          <div style={{
            display: 'flex', gap: 6, overflowX: 'auto',
            padding: '8px 0', scrollbarWidth: 'none',
          }}>
            {allTags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleFilterTag(tag)}
                  style={{
                    flexShrink: 0,
                    padding: '8px 14px', borderRadius: 20,
                    border: `2px solid ${active ? COLORS.primary : COLORS.border}`,
                    background: active ? COLORS.primaryLight : COLORS.card,
                    color: active ? COLORS.tagText : COLORS.textLight,
                    fontSize: 16, cursor: 'pointer',
                    whiteSpace: 'nowrap', minHeight: 44,
                    fontWeight: active ? 700 : 400,
                  }}
                >{tag}</button>
              );
            })}
          </div>
        )}
        {showLastYear && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 4px 8px',
          }}>
            <span style={{ fontSize: 16, color: COLORS.accent, fontWeight: 600 }}>
              🗓️ 去年のこの頃を表示中
            </span>
            <button
              onClick={() => setShowLastYear(false)}
              style={{
                padding: '6px 12px', borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.card, color: COLORS.textLight,
                fontSize: 14, cursor: 'pointer',
              }}
            >解除</button>
          </div>
        )}
      </div>

      {/* コンテンツ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {error && (
          <div style={{
            padding: 12, borderRadius: 8, background: '#FEE', color: '#C00',
            fontSize: 16, marginBottom: 12,
          }}>エラー: {error}</div>
        )}

        {loading ? (
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            height: 200, color: COLORS.textLight, fontSize: 24,
          }}>
            <div style={{
              width: 32, height: 32, border: `3px solid ${COLORS.border}`,
              borderTop: `3px solid ${COLORS.primary}`,
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {/* 去年のこの頃カード（最上部・記録が0件または1年目は非表示） */}
            {!showLastYear && lastYearRecords.length > 0 && (
              <LastYearCard
                records={lastYearRecords}
                onShowAll={() => setShowLastYear(true)}
              />
            )}

            {filtered.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '60px 20px', color: COLORS.textLight, gap: 12,
              }}>
                <span style={{ fontSize: 48 }}>🌱</span>
                <span style={{ fontSize: 18 }}>記録がありません</span>
                <span style={{ fontSize: 16 }}>「追加」タブから記録を始めましょう</span>
              </div>
            ) : viewMode === 'grid' ? (
              // グリッドモード: 日付グループ内で2列
              groupedByDate.sortedDates.map((date) => (
                <div key={date} style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 16, fontWeight: 700, color: COLORS.primary,
                    marginBottom: 8, paddingLeft: 2,
                  }}>
                    {formatDateHeader(date)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {groupedByDate.groups[date].map((r) => renderCard(r))}
                  </div>
                </div>
              ))
            ) : (
              // リストモード: 日付グループ表示
              groupedByDate.sortedDates.map((date) => (
                <div key={date} style={{ marginBottom: 20 }}>
                  <div style={{
                    fontSize: 16, fontWeight: 700, color: COLORS.primary,
                    marginBottom: 8, paddingLeft: 2,
                    borderLeft: `3px solid ${COLORS.primary}`,
                    paddingLeft: 8,
                  }}>
                    {formatDateHeader(date)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {groupedByDate.groups[date].map((r) => renderCard(r))}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* 詳細モーダル */}
      {selectedRecord && (
        <DetailScreen
          record={selectedRecord}
          onClose={() => { setSelectedRecord(null); reload(); }}
          records={records}
          tags={tags}
        />
      )}
    </div>
  );
}
