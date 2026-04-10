// src/hooks/useTags.js
import { useState, useEffect, useCallback } from 'react';
import { getTags, saveTags, addTag, removeTag } from '../utils/db';

/**
 * タグを操作するカスタムフック
 *
 * 使い方:
 *   const { tags, loading, add, remove, reorder } = useTags();
 */
export function useTags() {
  const [tags,    setTags]    = useState({});
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // ─── 初回読み込み（なければ初期値をセット） ───
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getTags();
        setTags(data);
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
      if (tags[category]) return tags; // すでに存在する
      const current = { ...tags, [category]: [] };
      await saveTags(current);
      setTags(current);
      return current;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, [tags]);

  // ─── 全タグをフラット配列で取得（検索フィルター用） ───
  const allTagsFlat = Object.values(tags).flat();

  // ─── カテゴリ一覧 ───
  const categories = Object.keys(tags);

  return {
    tags,           // { 野菜: [...], 状態: [...], 場所: [...] }
    categories,     // ['野菜', '状態', '場所']
    allTagsFlat,    // ['トマト（大玉）', 'キュウリ', ...]
    loading,
    error,
    add,            // タグを1件追加
    remove,         // タグを1件削除
    reorder,        // カテゴリ内の並び替え
    addCategory,    // カテゴリを新規追加
  };
}
