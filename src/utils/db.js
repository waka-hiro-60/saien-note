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

// FileReader経由で読み込み toDataURL で変換（iOS Safari対応）
export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
      img.onload = () => {
        try {
          const MAX = 1920;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width >= height) { height = Math.round((height * MAX) / width); width = MAX; }
            else { width = Math.round((width * MAX) / height); height = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('canvasの取得に失敗しました')); return; }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          if (!dataUrl || dataUrl === 'data:,') { reject(new Error('画像の変換に失敗しました')); return; }
          const parts = dataUrl.split(',');
          if (parts.length < 2) { reject(new Error('画像データの解析に失敗しました')); return; }
          const bin = atob(parts[1]);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          resolve(new Blob([arr], { type: 'image/jpeg' }));
        } catch (err) {
          reject(new Error('画像の圧縮に失敗しました: ' + err.message));
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
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
      catch (e) { throw new Error('画像 ' + (i+1) + ' 枚目の圧縮に失敗しました: ' + e.message); }
    }
    record = { id, category: 'diary', date: data.date ?? '', time: data.time ?? '', images, text: data.text ?? '', archived: false, published: false, createdAt: now, updatedAt: now };
  } else if (category === 'bed') {
    const images = [];
    const fileList = Array.from(data.imageFiles ?? []);
    for (let i = 0; i < fileList.length; i++) {
      try { images.push(await compressImage(fileList[i])); }
      catch (e) { throw new Error('画像 ' + (i+1) + ' 枚目の圧縮に失敗しました: ' + e.message); }
    }
    record = { id, category: 'bed', date: data.date ?? '', time: data.time ?? '', images, comment: data.comment ?? '', tags: data.tags ?? [], archived: false, published: false, createdAt: now, updatedAt: now };
  } else {
    let imageBlob = null;
    if (data.imageFile) { imageBlob = await compressImage(data.imageFile); }
    record = { id, category: 'veggie', date: data.date ?? '', time: data.time ?? '', imageBlob, comment: data.comment ?? '', tags: data.tags ?? [], archived: false, published: false, createdAt: now, updatedAt: now };
  }

  await set(id, record, recordsStore);
  return record;
}

export async function updateRecord(id, updates) {
  const existing = await get(id, recordsStore);
  if (!existing) throw new Error('記録が見つかりません: ' + id);
  const category = existing.category ?? 'veggie';
  const { imageFile, imageFiles, addImageFiles, images: newImagesArray, ...restUpdates } = updates;
  const base = { ...existing, ...restUpdates, updatedAt: Date.now() };
  if (category === 'veggie') {
    if (imageFile) { base.imageBlob = await compressImage(imageFile); }
  } else {
    let images = existing.images ?? [];
    if (newImagesArray !== undefined) { images = newImagesArray; }
    if (imageFiles && imageFiles.length > 0) {
      const fileList = Array.from(imageFiles);
      images = [];
      for (let i = 0; i < fileList.length; i++) {
        try { images.push(await compressImage(fileList[i])); }
        catch (e) { throw new Error('画像 ' + (i+1) + ' 枚目の圧縮に失敗しました: ' + e.message); }
      }
    } else if (addImageFiles && addImageFiles.length > 0) {
      const fileList = Array.from(addImageFiles);
      for (let i = 0; i < fileList.length; i++) {
        try { images.push(await compressImage(fileList[i])); }
        catch (e) { throw new Error('追加画像 ' + (i+1) + ' 枚目の圧縮に失敗しました: ' + e.message); }
      }
    }
    base.images = images;
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
