// src/utils/db.js
import { get, set, del, keys, createStore } from 'idb-keyval';

// ─────────────────────────────────────────
// ストア定義（2つ）
// ─────────────────────────────────────────
export const recordsStore = createStore('saien-note-db', 'records');
export const tagsStore    = createStore('saien-note-db', 'tags');

// ─────────────────────────────────────────
// タグ初期データ
// ─────────────────────────────────────────
export const DEFAULT_TAGS = {
  野菜: [
    'トマト（大玉）', 'トマト（中玉）', 'トマト（ミニ）',
    'キュウリ', 'ゴーヤ', 'インゲン（つる有）',
    'スナップエンドウ（つる有）', 'ピーマン', 'シシトウ',
    '赤トウガラシ', 'ナス', 'オクラ', 'ジャガイモ',
    'サツマイモ', 'エダマメ', 'ソラマメ', '小松菜',
    'ネギ', 'ニラ', 'サンチュ', 'サニーレタス',
  ],
  状態: [
    '土準備', '畝づくり', 'マルチ張', '種まき',
    '定植', '肥料', '水やり', '剪定', '収穫',
  ],
  場所: ['畝1', '畝2', '畝3', '畝4', '畝5'],
};

// ─────────────────────────────────────────
// 画像圧縮ユーティリティ
// 長辺1920px・品質80%に圧縮してBlobを返す
// ─────────────────────────────────────────
export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const MAX = 1920;
      let { width, height } = img;

      // 長辺が1920pxを超える場合だけリサイズ
      if (width > MAX || height > MAX) {
        if (width >= height) {
          height = Math.round((height * MAX) / width);
          width  = MAX;
        } else {
          width  = Math.round((width * MAX) / height);
          height = MAX;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error('画像の圧縮に失敗しました'));
        },
        'image/jpeg',
        0.8,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像の読み込みに失敗しました'));
    };

    img.src = url;
  });
}

// ─────────────────────────────────────────
// Records CRUD
// ─────────────────────────────────────────

/**
 * 全記録を取得（撮影日時の新しい順）
 */
export async function getAllRecords() {
  const allKeys = await keys(recordsStore);
  if (allKeys.length === 0) return [];

  const records = await Promise.all(
    allKeys.map((k) => get(k, recordsStore))
  );

  return records
    .filter(Boolean)
    .sort((a, b) => {
      const aStr = `${a.date}T${a.time || '00:00'}`;
      const bStr = `${b.date}T${b.time || '00:00'}`;
      return bStr.localeCompare(aStr);
    });
}

/**
 * 1件取得
 */
export async function getRecord(id) {
  return get(id, recordsStore);
}

/**
 * 新規記録を保存
 * @param {object} data - { date, time, imageFile, comment, tags }
 */
export async function addRecord(data) {
  const now = Date.now();
  const id  = crypto.randomUUID();

  let imageBlob = null;
  if (data.imageFile) {
    imageBlob = await compressImage(data.imageFile);
  }

  const record = {
    id,
    date:      data.date    ?? '',
    time:      data.time    ?? '',
    imageBlob,
    comment:   data.comment ?? '',
    tags:      data.tags    ?? [],
    archived:  false,
    published: false,
    createdAt: now,
    updatedAt: now,
  };

  await set(id, record, recordsStore);
  return record;
}

/**
 * 記録を更新
 * @param {string} id
 * @param {object} updates - 更新するフィールド
 */
export async function updateRecord(id, updates) {
  const existing = await get(id, recordsStore);
  if (!existing) throw new Error(`記録が見つかりません: ${id}`);

  let imageBlob = existing.imageBlob;
  if (updates.imageFile) {
    imageBlob = await compressImage(updates.imageFile);
    delete updates.imageFile;
  }

  const updated = {
    ...existing,
    ...updates,
    imageBlob,
    updatedAt: Date.now(),
  };

  await set(id, updated, recordsStore);
  return updated;
}

/**
 * 記録を削除
 */
export async function deleteRecord(id) {
  await del(id, recordsStore);
}

/**
 * アーカイブ状態を切り替え
 */
export async function toggleArchive(id) {
  const record = await get(id, recordsStore);
  if (!record) throw new Error(`記録が見つかりません: ${id}`);
  return updateRecord(id, { archived: !record.archived });
}

/**
 * まとめて公開
 * @param {string[]} ids
 */
export async function publishRecords(ids) {
  await Promise.all(
    ids.map((id) => updateRecord(id, { published: true }))
  );
}

/**
 * 非公開に戻す
 */
export async function unpublishRecord(id) {
  return updateRecord(id, { published: false });
}

// ─────────────────────────────────────────
// Tags CRUD
// ─────────────────────────────────────────

/**
 * タグ設定を取得（初回は初期値をセット）
 */
export async function getTags() {
  const stored = await get('tags', tagsStore);
  if (stored) return stored;
  await set('tags', DEFAULT_TAGS, tagsStore);
  return DEFAULT_TAGS;
}

/**
 * タグ設定を保存（全体を上書き）
 */
export async function saveTags(tags) {
  await set('tags', tags, tagsStore);
}

/**
 * カテゴリにタグを1件追加
 */
export async function addTag(category, tag) {
  const tags = await getTags();
  if (!tags[category]) tags[category] = [];
  if (!tags[category].includes(tag)) {
    tags[category] = [...tags[category], tag];
    await saveTags(tags);
  }
  return tags;
}

/**
 * カテゴリからタグを1件削除
 */
export async function removeTag(category, tag) {
  const tags = await getTags();
  if (!tags[category]) return tags;
  tags[category] = tags[category].filter((t) => t !== tag);
  await saveTags(tags);
  return tags;
}
