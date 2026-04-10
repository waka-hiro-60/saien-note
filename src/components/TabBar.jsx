// src/components/TabBar.jsx
const COLORS = {
  bg:        '#F7F5F0',
  card:      '#FFFFFF',
  primary:   '#4A7C59',
  textLight: '#888888',
  border:    '#E5E0D8',
};

const TABS = [
  { id: 'home',    label: 'ホーム',  icon: '🏠' },
  { id: 'tag',     label: 'タグ',    icon: '🏷️' },
  { id: 'add',     label: '追加',    icon: '➕', isCenter: true },
  { id: 'publish', label: '公開',    icon: '🌐' },
  { id: 'setting', label: '設定',    icon: '⚙️' },
];

export function TabBar({ activeTab, onTabChange }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: COLORS.card,
      borderTop: `1px solid ${COLORS.border}`,
      height: 64,
      flexShrink: 0,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {TABS.map((tab) => {
        if (tab.isCenter) {
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: COLORS.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                boxShadow: '0 2px 8px rgba(74,124,89,0.4)',
                marginTop: -16,
              }}>
                {tab.icon}
              </div>
            </button>
          );
        }

        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: isActive ? COLORS.primary : COLORS.textLight,
              minHeight: 44,
              padding: '4px 0',
              gap: 2,
            }}
          >
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400 }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
