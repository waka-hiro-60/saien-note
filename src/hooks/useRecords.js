// src/hooks/useRecords.js
import { useState, useEffect, useCallback } from 'react';
import {
  getAllRecords,
  getRecord,
  addRecord,
  updateRecord,
  deleteRecord,
  toggleArchive,
  publishRecords,
  unpublishRecord,
} from '../utils/db';

/**
 * 記録を操作するカスタムフック
 *
 * 使い方:
 *   const { records, loading, error, add, update, remove, ... } = useRecords();
 */
export function useRecords() {
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(null);

  // ─── 全記録を再読み込み ───
  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllRecords();
      setRecords(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初回マウント時に読み込み
  useEffect(() => {
    reload();
  }, [reload]);

  // ─── 新規追加 ───
  const add = useCallback(async (data) => {
    try {
      setError(null);
      const record = await addRecord(data);
      setRecords((prev) => [record, ...prev]);
      return record;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, []);

  // ─── 更新 ───
  const update = useCallback(async (id, updates) => {
    try {
      setError(null);
      const updated = await updateRecord(id, updates);
      setRecords((prev) =>
        prev.map((r) => (r.id === id ? updated : r))
      );
      return updated;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, []);

  // ─── 削除 ───
  const remove = useCallback(async (id) => {
    try {
      setError(null);
      await deleteRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, []);

  // ─── アーカイブ切り替え ───
  const toggleArchived = useCallback(async (id) => {
    try {
      setError(null);
      const updated = await toggleArchive(id);
      setRecords((prev) =>
        prev.map((r) => (r.id === id ? updated : r))
      );
      return updated;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, []);

  // ─── まとめて公開 ───
  const publish = useCallback(async (ids) => {
    try {
      setError(null);
      await publishRecords(ids);
      setRecords((prev) =>
        prev.map((r) =>
          ids.includes(r.id) ? { ...r, published: true } : r
        )
      );
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, []);

  // ─── 非公開に戻す ───
  const unpublish = useCallback(async (id) => {
    try {
      setError(null);
      const updated = await unpublishRecord(id);
      setRecords((prev) =>
        prev.map((r) => (r.id === id ? updated : r))
      );
      return updated;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, []);

  // ─── タグで絞り込み ───
  const filterByTags = useCallback(
    (selectedTags) => {
      if (!selectedTags || selectedTags.length === 0) return records;
      return records.filter((r) =>
        selectedTags.every((tag) => r.tags.includes(tag))
      );
    },
    [records]
  );

  // ─── キーワード検索 ───
  const search = useCallback(
    (keyword) => {
      if (!keyword || keyword.trim() === '') return records;
      const kw = keyword.trim().toLowerCase();
      return records.filter(
        (r) =>
          r.comment.toLowerCase().includes(kw) ||
          r.tags.some((t) => t.toLowerCase().includes(kw))
      );
    },
    [records]
  );

  // ─── タグ＋キーワード複合検索 ───
  const searchAndFilter = useCallback(
    (keyword, selectedTags) => {
      let result = records;
      if (selectedTags && selectedTags.length > 0) {
        result = result.filter((r) =>
          selectedTags.every((tag) => r.tags.includes(tag))
        );
      }
      if (keyword && keyword.trim() !== '') {
        const kw = keyword.trim().toLowerCase();
        result = result.filter(
          (r) =>
            r.comment.toLowerCase().includes(kw) ||
            r.tags.some((t) => t.toLowerCase().includes(kw))
        );
      }
      return result;
    },
    [records]
  );

  // ─── 特定タグの時系列記録（年比較用） ───
  // returns: { [year]: Record[] }
  const getByTagGroupedByYear = useCallback(
    (tag) => {
      const filtered = records.filter((r) => r.tags.includes(tag));
      return filtered.reduce((acc, r) => {
        const year = r.date ? r.date.slice(0, 4) : '不明';
        if (!acc[year]) acc[year] = [];
        acc[year].push(r);
        return acc;
      }, {});
    },
    [records]
  );

  return {
    records,          // 全記録（撮影日時降順）
    loading,          // 読み込み中フラグ
    error,            // エラーメッセージ
    reload,           // 再読み込み
    add,              // 新規追加
    update,           // 更新
    remove,           // 削除
    toggleArchived,   // アーカイブ切り替え
    publish,          // まとめて公開
    unpublish,        // 非公開に戻す
    filterByTags,     // タグ絞り込み
    search,           // キーワード検索
    searchAndFilter,  // タグ＋キーワード複合検索
    getByTagGroupedByYear, // 年比較用
  };
}
