import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type EntityType = 'customer' | 'shipment';

type HighlightsState = {
  customer: Set<string>;
  shipment: Set<string>;
};

type HighlightsContextValue = {
  isNew: (type: EntityType, id: string) => boolean;
  addNew: (type: EntityType, id: string) => void;
  dismiss: (type: EntityType, id: string) => void;
  clearAll: () => void;
};

const HighlightsContext = createContext<HighlightsContextValue | undefined>(undefined);

export function HighlightsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HighlightsState>({ customer: new Set(), shipment: new Set() });

  const isNew = useCallback((type: EntityType, id: string) => {
    return state[type].has(id);
  }, [state]);

  const addNew = useCallback((type: EntityType, id: string) => {
    setState((prev) => {
      const next = { customer: new Set(prev.customer), shipment: new Set(prev.shipment) };
      next[type].add(id);
      return next;
    });
  }, []);

  const dismiss = useCallback((type: EntityType, id: string) => {
    setState((prev) => {
      const next = { customer: new Set(prev.customer), shipment: new Set(prev.shipment) };
      next[type].delete(id);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setState({ customer: new Set(), shipment: new Set() });
  }, []);

  const value = useMemo(() => ({ isNew, addNew, dismiss, clearAll }), [isNew, addNew, dismiss, clearAll]);

  return (
    <HighlightsContext.Provider value={value}>{children}</HighlightsContext.Provider>
  );
}

export function useHighlights() {
  const ctx = useContext(HighlightsContext);
  if (!ctx) throw new Error('useHighlights must be used within a HighlightsProvider');
  return ctx;
}

