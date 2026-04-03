import useSWR, { type SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import { apiClient } from '@/lib/api-client';
import type { Member, JoinRequest } from '@/types/api';

// ─── Members ──────────────────────────────────────────────────────────────────

export function useCongregationMembers(
  congregationId: string | null | undefined,
  options?: SWRConfiguration
) {
  const { data, error, isLoading, mutate } = useSWR<Member[]>(
    congregationId ? `/api/congregations/${congregationId}/members` : null,
    (url) => apiClient.get<Member[]>(url),
    { revalidateOnFocus: false, ...options }
  );
  return {
    data: data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

// ─── Join requests ────────────────────────────────────────────────────────────

export function useCongregationJoinRequests(
  congregationId: string | null | undefined,
  status?: string,
  options?: SWRConfiguration
) {
  const query = status ? `?status=${status}` : '';
  const { data, error, isLoading, mutate } = useSWR<JoinRequest[]>(
    congregationId ? `/api/congregations/${congregationId}/join-requests${query}` : null,
    (url) => apiClient.get<JoinRequest[]>(url),
    { revalidateOnFocus: false, ...options }
  );
  return {
    data: data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

// ─── Review join request ──────────────────────────────────────────────────────

export function useReviewJoinRequest(congregationId: string) {
  const { trigger, isMutating } = useSWRMutation(
    `/api/congregations/${congregationId}/join-requests`,
    (_url: string, { arg }: { arg: { requestId: string; status: string; reviewNote?: string } }) =>
      apiClient.patch(`/api/congregations/${congregationId}/join-requests/${arg.requestId}`, {
        status: arg.status,
        reviewNote: arg.reviewNote,
      })
  );
  return { review: trigger, isReviewing: isMutating };
}

// ─── Update member role ───────────────────────────────────────────────────────

export function useUpdateMemberRole(congregationId: string) {
  const { trigger, isMutating } = useSWRMutation(
    `/api/congregations/${congregationId}/members`,
    (_url: string, { arg }: { arg: { userId: string; congregationRole: string | null } }) =>
      apiClient.patch(`/api/congregations/${congregationId}/members/${arg.userId}`, {
        congregationRole: arg.congregationRole,
      })
  );
  return { updateRole: trigger, isUpdating: isMutating };
}

// ─── Add member ───────────────────────────────────────────────────────────────

export function useAddMember(congregationId: string) {
  const { trigger, isMutating } = useSWRMutation(
    `/api/congregations/${congregationId}/members`,
    (url: string, { arg }: { arg: Record<string, unknown> }) => apiClient.post(url, arg)
  );
  return { addMember: trigger, isAdding: isMutating };
}
