import useSWR from 'swr';
import { fetchWithAuth } from '@/lib/api-client';

const fetcher = (url: string) => fetchWithAuth(url);

export function useCoverageReport(congregationId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    congregationId ? `/api/congregations/${congregationId}/reports/coverage` : null,
    fetcher
  );
  return {
    data: (data as { data: unknown } | undefined)?.data ?? null,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function usePublishersReport(congregationId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    congregationId ? `/api/congregations/${congregationId}/reports/publishers` : null,
    fetcher
  );
  return {
    data: (data as { data: unknown } | undefined)?.data ?? null,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useActivityReport(congregationId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    congregationId ? `/api/congregations/${congregationId}/reports/activity` : null,
    fetcher
  );
  return {
    data: (data as { data: unknown } | undefined)?.data ?? null,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}
