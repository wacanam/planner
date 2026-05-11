import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
export const metadata: Metadata = { title: 'My Households | Ministry Planner' };

export default async function HouseholdsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const householdId = params.householdId;
  const resolvedHouseholdId = Array.isArray(householdId) ? householdId[0] : householdId;
  const target = resolvedHouseholdId
    ? `/records/households?householdId=${encodeURIComponent(resolvedHouseholdId)}`
    : '/records/households';
  redirect(target);
}
