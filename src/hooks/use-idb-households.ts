'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAllHouseholds } from '@/lib/db/households';
import type { HouseholdRecord } from '@/lib/db/types';

export function useIDBHouseholds() {
  const [households, setHouseholds] = useState<HouseholdRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await getAllHouseholds();
    setHouseholds(data);
  }, []);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));

    const onChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ store?: string }>;
      if (customEvent.detail?.store === 'households') {
        void refresh();
      }
    };

    window.addEventListener('planner:idb-change', onChange);
    return () => window.removeEventListener('planner:idb-change', onChange);
  }, [refresh]);

  return { households, loading, refresh };
}
