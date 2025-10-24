import { useState, useCallback, useMemo } from 'react';

interface UseSelectionReturn {
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  toggleSelectAll: (allIds: string[]) => void;
  clearSelection: () => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  selectedCount: number;
}

export function useTableSelection(allIds: string[] = []): UseSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback((allIds: string[]) => {
    setSelectedIds((prev) => {
      if (prev.size === allIds.length) {
        return new Set();
      }
      return new Set(allIds);
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isAllSelected = useMemo(() => {
    return allIds.length > 0 && selectedIds.size === allIds.length;
  }, [allIds.length, selectedIds.size]);

  const isIndeterminate = useMemo(() => {
    return selectedIds.size > 0 && selectedIds.size < allIds.length;
  }, [allIds.length, selectedIds.size]);

  const selectedCount = selectedIds.size;

  return {
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    isAllSelected,
    isIndeterminate,
    selectedCount,
  };
}
