import useSWR, { type SWRConfiguration } from 'swr';
import { apiClient } from '@/lib/api-client';
import type { CoverageReport, PublishersReport, ActivityReport } from '@/types/api';

export function useCoverageReport(
  congregationId: string | null | undefined,
  options?: SWRConfiguration
) {
  const { data, error, isLoading, mutate } = useSWR<CoverageReport>(
    congregationId
      ? `/api/congregations/${congregationId}/reports/coverage`
      : null,
    (url) => apiClient.get<CoverageReport>(url),
    { revalidateOnFocus: false, ...options }
  );
  return {
    data: data ?? null,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function usePublishersReport(
  congregationId: string | null | undefined,
  options?: SWRConfiguration
) {
  const { data, error, isLoading, mutate } = useSWR<PublishersReport>(
    congregationId
      ? `/api/congregations/${congregationId}/reports/publishers`
      : null,
    (url) => apiClient.get<PublishersReport>(url),
    { revalidateOnFocus: false, ...options }
  );
  return {
    data: data ?? null,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useActivityReport(
  congregationId: string | null | undefined,
  options?: SWRConfiguration
) {
  const { data, error, isLoading, mutate } = useSWR<ActivityReport>(
    congregationId
      ? `/api/congregations/${congregationId}/reports/activity`
      : null,
    (url) => apiClient.get<ActivityReport>(url),
    { revalidateOnFocus: false, ...options }
  );
  return {
    data: data ?? null,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}
