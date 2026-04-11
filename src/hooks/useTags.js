// src/hooks/useTags.js
import { useState, useEffect, useCallback } from 'react';
import {
  getTags, saveTags, addTag, removeTag,
  getBedVeggieMap, saveBedVeggieMap,
} from '../utils/db';

export function useTags() {
  const [tags,         setTags]         = useState({});
  const [bedVeggieMap, setBedVeggieMap] = useState({});
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  // ─── 初回読み込み ───
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [data, bvm] = await Promise.all([getTags(), getBedVeggieMap()]);
        setTags(data);
        setBedVeggieMap(bvm);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ─── タグを1件追加 ───
  const add = useCallback(async (category, tag) => {
    try {
      setError(null);
      const updated = await addTag(category, tag);
      setTags({ ...updated });
      return updated;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, []);

  // ─── タグを1件削除 ───
  const remove = useCallback(async (category, tag) => {
    try {
      setError(null);
      const updated = await removeTag(category, tag);
      setTags({ ...updated });
      return updated;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, []);

  // ─── カテゴリ内の並び順を変更 ───
  const reorder = useCallback(async (category, newOrder) => {
    try {
      setError(null);
      const current = { ...tags };
      current[category] = newOrder;
      await saveTags(current);
      setTags({ ...current });
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, [tags]);

  // ─── カテゴリを新規追加 ───
  const addCategory = useCallback(async (category) => {
    try {
      setError(null);
      if (tags[category]) return tags;
      const current = { ...tags, [category]: [] };
      await saveTags(current);
      setTags(current);
      return current;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, [tags]);

  // ─── 畝↔野菜マッピングを更新 ───
  const updateBedVeggieMap = useCallback(async (newMap) => {
    try {
      setError(null);
      await saveBedVeggieMap(newMap);
      setBedVeggieMap({ ...newMap });
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, []);

  const allTagsFlat = Object.values(tags).flat();
  const categories  = Object.keys(tags);

  return {
    tags,           // { 野菜: [...], 状態: [...], 場所: [...] }
    categories,
    allTagsFlat,
    bedVeggieMap,   // { '畝1': ['トマト（大玉）', ...], ... }
    loading,
    error,
    add,
    remove,
    reorder,
    addCategory,
    updateBedVeggieMap,
  };
}
