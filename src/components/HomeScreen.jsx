// src/components/HomeScreen.jsx
import { useState, useEffect, useRef } from 'react';
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
  tagBg:        '#E8F0E9',
  tagText:      '#3A6B47',
};

function RecordImage({ imageBlob }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!imageBlob) return;
    const u = URL.createObjectURL(imageBlob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [imageBlob]);

  if (!url) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#E5E0D8', color: COLORS.textLight, fontSize: 24,
      }}>🌿</div>
    );
  }
  return <img src={url} alt="記録" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
}

function GridCard({ record, onTap }) {
  return (
    <div
      onClick={() => onTap(record)}
      style={{
        background: COLORS.card,
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ paddingTop: '100%', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <RecordImage imageBlob={record.imageBlob} />
        </div>
        {record.published && (
          <div style={{
            position: 'absolute', top: 6, right: 6,
            background: COLORS.accent, color: '#fff',
            fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 600,
          }}>公開</div>
        )}
      </div>
      <div style={{ padding: '8px' }}>
        <div style={{ fontSize: 13, color: COLORS.textLight }}>{record.date}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {(record.tags ?? []).slice(0, 2).map((tag) => (
            <span key={tag} style={{
              fontSize: 11, padding: '2px 6px', borderRadius: 20,
              background: COLORS.tagBg, color: COLORS.tagText,
            }}>{tag}</span>
          ))}
          {(record.tags ?? []).length > 2 && (
            <span style={{ fontSize: 11, color: COLORS.textLight }}>+{record.tags.length - 2}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ListCard({ record, onTap }) {
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
      <div style={{ width: 80, height: 80, flexShrink: 0 }}>
        <RecordImage imageBlob={record.imageBlob} />
      </div>
      <div style={{ flex: 1, padding: '10px 12px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, color: COLORS.textLight }}>{record.date}</span>
          {record.time && (
            <span style={{ fontSize: 13, color: COLORS.textLight }}>{record.time}</span>
          )}
          {record.published && (
            <span style={{
              background: COLORS.accent, color: '#fff',
              fontSize: 10, padding: '1px 5px', borderRadius: 8, fontWeight: 600,
            }}>公開</span>
          )}
        </div>
        {record.comment && (
          <div style={{
            fontSize: 14, color: COLORS.text,
            overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap', marginBottom: 4,
          }}>{record.comment}</div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(record.tags ?? []).slice(0, 3).map((tag) => (
            <span key={tag} style={{
              fontSize: 11, padding: '2px 6px', borderRadius: 20,
              background: COLORS.tagBg, color: COLORS.tagText,
            }}>{tag}</span>
          ))}
          {(record.tags ?? []).length > 3 && (
            <span style={{ fontSize: 11, color: COLORS.textLight }}>+{record.tags.length - 3}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function HomeScreen({ records, tags }) {
  const [viewMode, setViewMode]         = useState('grid'); // 'grid' | 'list'
  const [keyword, setKeyword]           = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const { loading, error, searchAndFilter, reload } = records;

  const filtered = (() => {
    let result = searchAndFilter(keyword, selectedTags);
    if (!showArchived) result = result.filter((r) => !r.archived);
    return result;
  })();

  const toggleFilterTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const allTags = tags.allTagsFlat ?? [];

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
              padding: '6px 10px', borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: showArchived ? COLORS.primaryLight : COLORS.card,
              color: showArchived ? COLORS.primary : COLORS.textLight,
              fontSize: 13, cursor: 'pointer',
            }}
          >📦</button>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              width: 36, height: 36, borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: viewMode === 'grid' ? COLORS.primaryLight : COLORS.card,
              color: viewMode === 'grid' ? COLORS.primary : COLORS.textLight,
              cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >⊞</button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              width: 36, height: 36, borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: viewMode === 'list' ? COLORS.primaryLight : COLORS.card,
              color: viewMode === 'list' ? COLORS.primary : COLORS.textLight,
              cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >☰</button>
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
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: `1px solid ${COLORS.border}`, fontSize: 16,
            background: COLORS.bg, color: COLORS.text,
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        {/* タグフィルター横スクロール */}
        {allTags.length > 0 && (
          <div style={{
            display: 'flex', gap: 6, overflowX: 'auto',
            padding: '8px 0',
            scrollbarWidth: 'none',
          }}>
            {allTags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleFilterTag(tag)}
                  style={{
                    flexShrink: 0,
                    padding: '5px 12px', borderRadius: 20,
                    border: `1px solid ${active ? COLORS.primary : COLORS.border}`,
                    background: active ? COLORS.primaryLight : COLORS.card,
                    color: active ? COLORS.tagText : COLORS.textLight,
                    fontSize: 13, cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >{tag}</button>
              );
            })}
          </div>
        )}
      </div>

      {/* コンテンツ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {error && (
          <div style={{
            padding: 12, borderRadius: 8, background: '#FEE', color: '#C00',
            fontSize: 14, marginBottom: 12,
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
        ) : filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '60px 20px', color: COLORS.textLight, gap: 8,
          }}>
            <span style={{ fontSize: 40 }}>🌱</span>
            <span style={{ fontSize: 16 }}>記録がありません</span>
            <span style={{ fontSize: 14 }}>「追加」タブから記録を始めましょう</span>
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          }}>
            {filtered.map((r) => (
              <GridCard key={r.id} record={r} onTap={setSelectedRecord} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((r) => (
              <ListCard key={r.id} record={r} onTap={setSelectedRecord} />
            ))}
          </div>
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
