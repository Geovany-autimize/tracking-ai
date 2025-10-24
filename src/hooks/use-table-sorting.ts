import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

interface UseSortingReturn<T> {
  sortColumn: string | null;
  sortDirection: SortDirection;
  toggleSort: (column: string) => void;
  sortedData: T[];
}

export function useTableSorting<T>(data: T[] | undefined, defaultColumn?: string): UseSortingReturn<T> {
  const [sortColumn, setSortColumn] = useState<string | null>(defaultColumn || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultColumn ? 'desc' : null);

  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!data || !sortColumn || !sortDirection) return data || [];

    return [...data].sort((a, b) => {
      const aValue = getNestedValue(a, sortColumn);
      const bValue = getNestedValue(b, sortColumn);

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

      // Determine type and sort accordingly
      if (typeof aValue === 'boolean') {
        const result = aValue === bValue ? 0 : aValue ? -1 : 1;
        return sortDirection === 'asc' ? result : -result;
      }

      if (typeof aValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (aValue instanceof Date || !isNaN(Date.parse(aValue))) {
        const dateA = new Date(aValue).getTime();
        const dateB = new Date(bValue).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }

      // String comparison (case-insensitive)
      const strA = String(aValue).toLowerCase();
      const strB = String(bValue).toLowerCase();
      const result = strA.localeCompare(strB);
      return sortDirection === 'asc' ? result : -result;
    });
  }, [data, sortColumn, sortDirection]);

  return { sortColumn, sortDirection, toggleSort, sortedData };
}

// Helper to get nested object values (e.g., "shipment_customer.first_name")
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
