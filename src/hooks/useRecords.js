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

export function useRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

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
      return records.filter((r) => {
        const rTags = r.tags ?? [];
        return selectedTags.every((tag) => rTags.includes(tag));
      });
    },
    [records]
  );

  // ─── キーワード検索（comment / text フィールド両対応） ───
  const search = useCallback(
    (keyword) => {
      if (!keyword || keyword.trim() === '') return records;
      const kw = keyword.trim().toLowerCase();
      return records.filter(
        (r) =>
          (r.comment ?? '').toLowerCase().includes(kw) ||
          (r.text    ?? '').toLowerCase().includes(kw) ||
          (r.tags    ?? []).some((t) => t.toLowerCase().includes(kw))
      );
    },
    [records]
  );

  // ─── タグ＋キーワード複合検索 ───
  const searchAndFilter = useCallback(
    (keyword, selectedTags) => {
      let result = records;
      if (selectedTags && selectedTags.length > 0) {
        result = result.filter((r) => {
          const rTags = r.tags ?? [];
          return selectedTags.every((tag) => rTags.includes(tag));
        });
      }
      if (keyword && keyword.trim() !== '') {
        const kw = keyword.trim().toLowerCase();
        result = result.filter(
          (r) =>
            (r.comment ?? '').toLowerCase().includes(kw) ||
            (r.text    ?? '').toLowerCase().includes(kw) ||
            (r.tags    ?? []).some((t) => t.toLowerCase().includes(kw))
        );
      }
      return result;
    },
    [records]
  );

  // ─── 特定タグの時系列記録（年比較用） ───
  const getByTagGroupedByYear = useCallback(
    (tag) => {
      const filtered = records.filter((r) => (r.tags ?? []).includes(tag));
      return filtered.reduce((acc, r) => {
        const year = r.date ? r.date.slice(0, 4) : '不明';
        if (!acc[year]) acc[year] = [];
        acc[year].push(r);
        return acc;
      }, {});
    },
    [records]
  );

  // ─── 日付範囲で絞り込み（去年のこの頃 用） ───
  const getRecordsInDateRange = useCallback(
    (startDate, endDate) => {
      return records.filter((r) => {
        if (!r.date || r.archived) return false;
        return r.date >= startDate && r.date <= endDate;
      });
    },
    [records]
  );

  return {
    records,
    loading,
    error,
    reload,
    add,
    update,
    remove,
    toggleArchived,
    publish,
    unpublish,
    filterByTags,
    search,
    searchAndFilter,
    getByTagGroupedByYear,
    getRecordsInDateRange,
  };
}
