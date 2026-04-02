import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { apiGet, apiPatch, apiPost } from '@/lib/api-client';

const fetcher = (url: string) => apiGet(url).then(r => r.data);

export function useCongregationMembers(congregationId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    congregationId ? `/api/congregations/${congregationId}/members` : null,
    fetcher
  );
  return {
    data: (data as { data: unknown[] } | undefined)?.data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useCongregationJoinRequests(congregationId: string, status?: string) {
  const query = status ? `?status=${status}` : '';
  const { data, error, isLoading, mutate } = useSWR(
    congregationId ? `/api/congregations/${congregationId}/join-requests${query}` : null,
    fetcher
  );
  return {
    data: (data as { data: unknown[] } | undefined)?.data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

export function useReviewJoinRequest(congregationId: string) {
  const { trigger, isMutating } = useSWRMutation(
    `/api/congregations/${congregationId}/join-requests`,
    (
      _url: string,
      { arg }: { arg: { requestId: string; status: string; reviewNote?: string } }
    ) =>
      apiPatch(
        `/api/congregations/${congregationId}/join-requests/${arg.requestId}`,
        { status: arg.status, reviewNote: arg.reviewNote }
      ).then(r => r.data)
  );
  return { review: trigger, isReviewing: isMutating };
}

export function useUpdateMemberRole(congregationId: string) {
  const { trigger, isMutating } = useSWRMutation(
    `/api/congregations/${congregationId}/members`,
    (
      _url: string,
      { arg }: { arg: { userId: string; congregationRole: string | null } }
    ) =>
      apiPatch(
        `/api/congregations/${congregationId}/members/${arg.userId}`,
        { congregationRole: arg.congregationRole }
      ).then(r => r.data)
  );
  return { updateRole: trigger, isUpdating: isMutating };
}

export function useAddMember(congregationId: string) {
  const { trigger, isMutating } = useSWRMutation(
    `/api/congregations/${congregationId}/members`,
    (url: string, { arg }: { arg: Record<string, unknown> }) =>
      apiPost(url, arg).then(r => r.data)
  );
  return { addMember: trigger, isAdding: isMutating };
}
