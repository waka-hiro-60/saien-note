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
      const dataUrl = e.target.result; // "data:image/jpeg;base64,..."
      if (!dataUrl) { reject(new Error('dataUrl取得失敗')); return; }

      const img = new Image();
      img.onerror = () => {
        // 圧縮失敗時はそのままBase64で返す
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
          if (!ctx) { resolve(dataUrl); return; } // canvas失敗時はそのまま返す
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressed && compressed !== 'data:,' ? compressed : dataUrl);
        } catch (err) {
          resolve(dataUrl); // 圧縮失敗時はそのまま返す
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

// Base64文字列 → Blob（表示用）
export function base64ToBlob(dataUrl) {
  if (!dataUrl) return null;
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const bin  = atob(parts[1]);
    const arr  = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  } catch (e) {
    return null;
  }
}

// Base64文字列からBlobURLを生成（画像表示用）
export function createImageUrl(imageData) {
  if (!imageData) return null;
  if (typeof imageData === 'string') {
    // Base64文字列の場合はそのまま返す
    return imageData;
  }
  if (imageData instanceof Blob) {
    return URL.createObjectURL(imageData);
  }
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

export async function addRecord(data) {
  const now = Date.now();
  const id  = crypto.randomUUID();
  const category = data.category ?? 'veggie';
  let record;

  if (category === 'diary') {
    const images = [];
    const fileList = Array.from(data.imageFiles ?? []);
    for (let i = 0; i < fileList.length; i++) {
      try { images.push(await compressImage(fileList[i])); }
      catch (e) { throw new Error('diary画像' + (i+1) + '枚目失敗:' + errMsg(e)); }
    }
    // Base64文字列として保存（BlobではなくString）
    record = { id, category: 'diary', date: data.date ?? '', time: data.time ?? '', imageBase64s: images, text: data.text ?? '', archived: false, published: false, createdAt: now, updatedAt: now };
  } else if (category === 'bed') {
    const images = [];
    const fileList = Array.from(data.imageFiles ?? []);
    for (let i = 0; i < fileList.length; i++) {
      try { images.push(await compressImage(fileList[i])); }
      catch (e) { throw new Error('bed画像' + (i+1) + '枚目失敗:' + errMsg(e)); }
    }
    record = { id, category: 'bed', date: data.date ?? '', time: data.time ?? '', imageBase64s: images, comment: data.comment ?? '', tags: data.tags ?? [], archived: false, published: false, createdAt: now, updatedAt: now };
  } else {
    let imageBase64 = null;
    if (data.imageFile) {
      try { imageBase64 = await compressImage(data.imageFile); }
      catch (e) { throw new Error('veggie画像失敗:' + errMsg(e)); }
    }
    record = { id, category: 'veggie', date: data.date ?? '', time: data.time ?? '', imageBase64, comment: data.comment ?? '', tags: data.tags ?? [], archived: false, published: false, createdAt: now, updatedAt: now };
  }

  try {
    await set(id, record, recordsStore);
  } catch (e) {
    throw new Error('IndexedDB保存失敗:' + errMsg(e));
  }
  return record;
}

export async function updateRecord(id, updates) {
  const existing = await get(id, recordsStore);
  if (!existing) throw new Error('記録が見つかりません: ' + id);
  const category = existing.category ?? 'veggie';
  const { imageFile, imageFiles, addImageFiles, images: newImagesArray, ...restUpdates } = updates;
  const base = { ...existing, ...restUpdates, updatedAt: Date.now() };

  if (category === 'veggie') {
    if (imageFile) { base.imageBase64 = await compressImage(imageFile); }
  } else {
    let images = existing.imageBase64s ?? [];
    if (newImagesArray !== undefined) { images = newImagesArray; }
    if (imageFiles && imageFiles.length > 0) {
      const fileList = Array.from(imageFiles);
      images = [];
      for (let i = 0; i < fileList.length; i++) { images.push(await compressImage(fileList[i])); }
    } else if (addImageFiles && addImageFiles.length > 0) {
      const fileList = Array.from(addImageFiles);
      for (let i = 0; i < fileList.length; i++) { images.push(await compressImage(fileList[i])); }
    }
    base.imageBase64s = images;
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
