// src/utils/db.js
import { get, set, del, keys, createStore } from 'idb-keyval';

export const recordsStore  = createStore('saien-note-records',  'records');
export const tagsStore     = createStore('saien-note-tags',     'tags');
export const settingsStore = createStore('saien-note-settings', 'settings');

export const DEFAULT_TAGS = {
  野菜: [
    'トマト（大玉）', 'トマト（中玉）', 'トマト（ミニ）',
    'キュウリ', 'ゴーヤ', 'インゲン（つる有）',
    'スナップエンドウ（つる有）', 'ピーマン', 'シシトウ',
    '赤トウガラシ', 'ナス', 'オクラ', 'ジャガイモ',
    'サツマイモ', 'エダマメ', 'ソラマメ', '小松菜',
    'ネギ', 'ニラ', 'サンチュ', 'サニーレタス',
  ],
  状態: ['土準備', '畝づくり', 'マルチ張', '種まき', '定植', '肥料', '水やり', '剪定', '収穫'],
  場所: ['畝1', '畝2', '畝3', '畝4', '畝5'],
};

function errMsg(e) {
  if (e == null) return 'null例外';
  if (typeof e === 'string') return e;
  return e.message ?? e.name ?? String(e);
}

// 画像をBase64文字列に変換（iOS SafariのIndexedDB Blob保存問題を回避）
export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('FileReader失敗'));
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (!dataUrl) { reject(new Error('dataUrl取得失敗')); return; }

      const img = new Image();
      img.onerror = () => {
        resolve(dataUrl);
      };
      img.onload = () => {
        try {
          const MAX = 1280;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width >= height) { height = Math.round((height * MAX) / width); width = MAX; }
            else { width = Math.round((width * MAX) / height); height = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(dataUrl); return; }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressed && compressed !== 'data:,' ? compressed : dataUrl);
        } catch (err) {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

// Base64文字列からBlobURLを生成（画像表示用）
export function createImageUrl(imageData) {
  if (!imageData) return null;
  if (typeof imageData === 'string') return imageData;
  return null;
}

export async function getAllRecords() {
  const allKeys = await keys(recordsStore);
  if (allKeys.length === 0) return [];
  const records = await Promise.all(allKeys.map((k) => get(k, recordsStore)));
  return records.filter(Boolean).sort((a, b) => {
    const aStr = a.date + 'T' + (a.time || '00:00');
    const bStr = b.date + 'T' + (b.time || '00:00');
    return bStr.localeCompare(aStr);
  });
}

export async function getRecord(id) { return get(id, recordsStore); }

// ─── addRecord ───────────────────────────────────────────────────────────────
// 全カテゴリ共通: コンポーネント側で圧縮済みのBase64を受け取る。
// ここでは圧縮しない。
// veggie  : data.imageBase64（文字列 | null）
// bed/diary: data.imageBase64s（文字列配列）
// ─────────────────────────────────────────────────────────────────────────────
export async function addRecord(data) {
  const now = Date.now();
  const id  = crypto.randomUUID();
  const category = data.category ?? 'veggie';
  let record;

  if (category === 'diary') {
    record = {
      id, category: 'diary',
      date: data.date ?? '', time: data.time ?? '',
      imageBase64s: data.imageBase64s ?? [],
      text: data.text ?? '',
      archived: false, published: false, createdAt: now, updatedAt: now,
    };
  } else if (category === 'bed') {
    record = {
      id, category: 'bed',
      date: data.date ?? '', time: data.time ?? '',
      imageBase64s: data.imageBase64s ?? [],
      comment: data.comment ?? '', tags: data.tags ?? [],
      archived: false, published: false, createdAt: now, updatedAt: now,
    };
  } else {
    record = {
      id, category: 'veggie',
      date: data.date ?? '', time: data.time ?? '',
      imageBase64: data.imageBase64 ?? null,
      comment: data.comment ?? '', tags: data.tags ?? [],
      archived: false, published: false, createdAt: now, updatedAt: now,
    };
  }

  try {
    await set(id, record, recordsStore);
  } catch (e) {
    throw new Error('IndexedDB保存失敗:' + errMsg(e));
  }
  return record;
}

// ─── updateRecord ─────────────────────────────────────────────────────────────
// 全カテゴリ共通: コンポーネント側で圧縮済みのBase64を受け取る。
// veggie  : updates.imageBase64 が渡された場合のみ上書き
// bed/diary: updates.imageBase64s が渡された場合のみ上書き
// ─────────────────────────────────────────────────────────────────────────────
export async function updateRecord(id, updates) {
  const existing = await get(id, recordsStore);
  if (!existing) throw new Error('記録が見つかりません: ' + id);
  const category = existing.category ?? 'veggie';

  // imageBase64 / imageBase64s は個別処理するため destructure して除外
  const { imageBase64: newImageBase64, imageBase64s: newBase64s, ...restUpdates } = updates;
  const base = { ...existing, ...restUpdates, updatedAt: Date.now() };

  if (category === 'veggie') {
    // 新しい画像が渡されたときのみ上書き（undefined の場合は既存を保持）
    if (newImageBase64 !== undefined) {
      base.imageBase64 = newImageBase64;
    }
  } else {
    // bed / diary: 配列ごと置き換え（undefined の場合は既存を保持）
    if (newBase64s !== undefined) {
      base.imageBase64s = newBase64s;
    }
  }

  await set(id, base, recordsStore);
  return base;
}

export async function deleteRecord(id) { await del(id, recordsStore); }

export async function toggleArchive(id) {
  const record = await get(id, recordsStore);
  if (!record) throw new Error('記録が見つかりません: ' + id);
  return updateRecord(id, { archived: !record.archived });
}

export async function publishRecords(ids) {
  await Promise.all(ids.map((id) => updateRecord(id, { published: true })));
}

export async function unpublishRecord(id) { return updateRecord(id, { published: false }); }

export async function getTags() {
  const stored = await get('tags', tagsStore);
  if (stored) return stored;
  await set('tags', DEFAULT_TAGS, tagsStore);
  return DEFAULT_TAGS;
}

export async function saveTags(tags) { await set('tags', tags, tagsStore); }

export async function addTag(category, tag) {
  const tags = await getTags();
  if (!tags[category]) tags[category] = [];
  if (!tags[category].includes(tag)) { tags[category] = [...tags[category], tag]; await saveTags(tags); }
  return tags;
}

export async function removeTag(category, tag) {
  const tags = await getTags();
  if (!tags[category]) return tags;
  tags[category] = tags[category].filter((t) => t !== tag);
  await saveTags(tags);
  return tags;
}

export async function getBedVeggieMap() { return (await get('bedVeggieMap', tagsStore)) ?? {}; }
export async function saveBedVeggieMap(map) { await set('bedVeggieMap', map, tagsStore); }

export async function getApiKey() { return (await get('apiKey', settingsStore)) ?? ''; }
export async function saveApiKey(key) { await set('apiKey', key.trim(), settingsStore); }
