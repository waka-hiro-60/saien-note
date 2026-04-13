// src/App.jsx
import { useState, useEffect } from 'react';
import { TabBar }        from './components/TabBar';
import { HomeScreen }    from './components/HomeScreen';
import { AddScreen }     from './components/AddScreen';
import { TagScreen }     from './components/TagScreen';
import { PublishScreen } from './components/PublishScreen';
import { SettingScreen } from './components/SettingScreen';
import { useRecords }    from './hooks/useRecords';
import { useTags }       from './hooks/useTags';
import { useSettings }   from './hooks/useSettings';

const COLORS = {
  bg: '#F7F5F0',
  text: '#2C2C2C',
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isOnline, setIsOnline]   = useState(navigator.onLine);

  // オフライン検知
  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const recordsHook  = useRecords();
  const tagsHook     = useTags();
  const settingsHook = useSettings();

  // APIキーがない状態で公開タブにいた場合はhomeに戻す
  useEffect(() => {
    if (!settingsHook.loading && !settingsHook.apiKey && activeTab === 'publish') {
      setActiveTab('home');
    }
  }, [settingsHook.apiKey, settingsHook.loading, activeTab]);

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':    return <HomeScreen    records={recordsHook} tags={tagsHook} />;
      case 'add':     return <AddScreen     records={recordsHook} tags={tagsHook} onDone={() => setActiveTab('home')} />;
      case 'tag':     return <TagScreen     records={recordsHook} tags={tagsHook} />;
      case 'publish': return <PublishScreen records={recordsHook} apiKey={settingsHook.apiKey} />;
      case 'setting': return <SettingScreen tags={tagsHook} records={recordsHook} settings={settingsHook} />;
      default:        return null;
    }
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: 430,
      margin: '0 auto',
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: COLORS.bg,
      color: COLORS.text,
      fontFamily: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* オフラインバナー */}
      {!isOnline && (
        <div style={{
          background: '#888',
          color: '#fff',
          textAlign: 'center',
          padding: '6px',
          fontSize: 13,
          flexShrink: 0,
        }}>
          オフライン（記録は保存されます）
        </div>
      )}

      {/* メイン画面 */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {renderScreen()}
      </div>

      {/* タブバー（APIキーがある場合のみ公開タブを表示） */}
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showPublish={!!settingsHook.apiKey}
      />
    </div>
  );
}
