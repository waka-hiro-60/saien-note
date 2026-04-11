# saien-note Step 3：画面実装 指示書

## 作業ディレクトリ
C:\Projects\saien-note\

## 技術スタック
- React（Vite）+ JavaScript
- idb-keyval（IndexedDB）
- CSS-in-JS不使用・インラインスタイルで統一

## カラーパレット（全画面共通）
```javascript
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
```

## UI共通ルール
- タッチターゲット最小44px（iOSガイドライン準拠）
- 重要操作は画面下部に配置（片手操作対応）
- フォントサイズ: 本文16px・補助14px・見出し18px
- 角丸: カード12px・ボタン8px・タグ20px（pill形状）
- オフライン時はヘッダーに「オフライン」バナーを表示

---

## Step 3-1：App.jsx の書き換え

src/App.jsx を以下の内容に**完全に上書き**してください。

```jsx
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

  const recordsHook = useRecords();
  const tagsHook    = useTags();

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':    return <HomeScreen    records={recordsHook} tags={tagsHook} />;
      case 'add':     return <AddScreen     records={recordsHook} tags={tagsHook} onDone={() => setActiveTab('home')} />;
      case 'tag':     return <TagScreen     records={recordsHook} tags={tagsHook} />;
      case 'publish': return <PublishScreen records={recordsHook} />;
      case 'setting': return <SettingScreen tags={tagsHook} records={recordsHook} />;
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

      {/* タブバー */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
```

---

## Step 3-2：TabBar.jsx

src/components/TabBar.jsx を作成してください。

仕様：
- 5タブ：ホーム・追加・タグ・公開・設定
- アイコンはUnicode絵文字を使用
- アクティブタブはprimaryカラー・非アクティブはtextLight
- 「追加」タブは中央に大きめの円形ボタン

```
🏠 ホーム（home）
➕ 追加（add）※中央・目立つデザイン
🏷️ タグ（tag）
🌐 公開（publish）
⚙️ 設定（setting）
```

---

## Step 3-3：HomeScreen.jsx

src/components/HomeScreen.jsx を作成してください。

仕様：
- ヘッダー：「自給菜園ノート」ロゴ + グリッド/リスト切替ボタン
- 検索バー：テキスト入力 + タグフィルター（横スクロール）
- 一覧表示（グリッド）：2列・正方形カード・写真＋日付＋タグ
- 一覧表示（リスト）：1列・横長カード・写真左＋日付・コメント・タグ右
- アーカイブ済みは非表示（設定で切替可）
- カードタップ → DetailScreenをモーダル表示
- ローディング中はスピナー表示

DetailScreenはモーダルとして HomeScreen 内で管理してください：
```jsx
const [selectedRecord, setSelectedRecord] = useState(null);
// selectedRecordがあればDetailScreenをオーバーレイ表示
```

---

## Step 3-4：DetailScreen.jsx

src/components/DetailScreen.jsx を作成してください。

仕様：
- 全画面モーダル（上からスライドイン）
- 写真：全幅表示
- 情報：日付・時刻・タグ（pill表示）・コメント
- ボタン（下部）：
  - 編集（鉛筆アイコン）→ 編集モードに切替
  - アーカイブ（箱アイコン）→ toggleArchived
  - 削除（ゴミ箱アイコン）→ 確認ダイアログ後に削除
  - 閉じる（×）→ モーダルを閉じる
- 編集モード：日付・時刻・コメント・タグを編集可能
- 写真は編集モードでも差し替え可能（カメラ/アルバム選択）
- 公開済みバッジ（published:trueの場合に表示）

---

## Step 3-5：AddScreen.jsx

src/components/AddScreen.jsx を作成してください。

仕様：
- 写真エリア（上半分）：
  - 未選択時：カメラ起動ボタン＋アルバム選択ボタンを並べて表示
  - 選択後：プレビュー表示（タップで再選択）
  - カメラ：input[type=file accept="image/*" capture="environment"]
  - アルバム：input[type=file accept="image/*"]
- 入力フォーム（下半分）：
  - 日付（date picker・デフォルト今日）
  - 時刻（time picker・デフォルト現在時刻）
  - タグ選択（カテゴリ別にタグボタンを表示・複数選択可）
  - コメント（textarea・3行）
- 保存ボタン（下部固定）：
  - 写真は任意（写真なしでも保存可）
  - 保存後はホームに戻る（onDone()を呼ぶ）

---

## Step 3-6：TagScreen.jsx

src/components/TagScreen.jsx を作成してください。

仕様：
- タグ選択（上部）：全タグからひとつ選ぶ（カテゴリ別）
- モード切替：「時系列」「年比較」タブ

### 時系列モード
- 選択したタグの記録を撮影日時順に表示
- 月でさらに絞り込み可能

### 年比較モード
- 年セレクター：左右それぞれプルダウンで年を選択
- 左右2列に同じタグの記録を並べて表示（各列は日付順）
- 月フィルター（共通）：同じ月を左右に表示

---

## Step 3-7：PublishScreen.jsx

src/components/PublishScreen.jsx を作成してください。

仕様：
- 未公開の記録一覧（チェックボックス付き）
- 全選択/解除ボタン
- 「まとめて公開」ボタン（選択した記録をpublish）
- 公開済み記録一覧（別セクション）：非公開に戻すボタン付き
- 公開APIへの送信処理：
  - エンドポイント：https://api.saien.career-life.tech/publish（仮）
  - ヘッダー：Authorization: Bearer {VITE_API_KEY}
  - ボディ：{ records: [ { id, date, time, comment, tags, imageKey } ] }
  - 画像はBlobをFormDataで送信
  - VITE_API_KEYは環境変数（import.meta.env.VITE_API_KEY）
  - API未実装中はコンソールにログを出すだけのモック処理にする

---

## Step 3-8：SettingScreen.jsx

src/components/SettingScreen.jsx を作成してください。

仕様：
- タグ管理：
  - カテゴリ別にタグ一覧表示
  - タグ追加（テキスト入力＋追加ボタン）
  - タグ削除（各タグに×ボタン）
- バックアップ（ZIPエクスポート）：
  - 「バックアップをダウンロード」ボタン
  - 全記録の imageBlob をファイル化
  - data.json（idとimageBlob以外のメタデータ）
  - tags.json（タグ設定）
  - ZIPファイル名：saien-note-backup-{YYYYMMDD}.zip
  - JSZipを使用（インストール済み）
- アプリ情報：バージョン・作者

---

## 実装後の作業

全ファイルの作成が完了したら以下を実行してください：

```powershell
git add .
git commit -m "feat: Step3 画面実装（全画面）"
git push origin main
```

その後、ローカルで動作確認：
```powershell
npm run dev
```

ブラウザで http://localhost:5173 を開いて動作を確認してください。

---

## 注意事項

- CSS moduleやstyled-componentsは使用しない（インラインスタイルのみ）
- `<form>`タグは使用しない（onClickで処理）
- 画像表示には URL.createObjectURL(blob) を使用し、不要になったら URL.revokeObjectURL() で解放
- エラーが出た場合はコンソールに表示し、画面にもエラーメッセージを表示
- ローディング状態は必ず表示する
