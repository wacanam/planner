import { type NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { withCongregationAuth } from '@/lib/auth-middleware';
import {
  db,
  congregations,
  congregationMembers,
  notifications,
  MemberStatus,
  CongregationRole,
  NotificationType,
} from '@/db';

// PATCH /api/congregations/:id/join-requests/:requestId — approve or reject
// Only service_overseer can act
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const { id, requestId } = await params;
  const auth = await withCongregationAuth(req, id, CongregationRole.SERVICE_OVERSEER);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json();
  const { status, reviewNote } = body as { status: MemberStatus; reviewNote?: string };

  if (!([MemberStatus.ACTIVE, MemberStatus.REJECTED] as string[]).includes(status)) {
    return NextResponse.json(
      { error: 'status must be "active" (approve) or "rejected".' },
      { status: 400 }
    );
  }

  const [member] = await db
    .select()
    .from(congregationMembers)
    .where(
      and(
        eq(congregationMembers.id, requestId),
        eq(congregationMembers.congregationId, id),
        eq(congregationMembers.status, MemberStatus.PENDING)
      )
    )
    .limit(1);

  if (!member) {
    return NextResponse.json(
      { error: 'Pending join request not found.' },
      { status: 404 }
    );
  }

  // Update the member record in place
  const [updated] = await db
    .update(congregationMembers)
    .set({
      status,
      reviewedBy: user.userId,
      reviewedAt: new Date(),
      reviewNote: reviewNote?.trim() || null,
    })
    .where(eq(congregationMembers.id, requestId))
    .returning();

  // Notify the requester
  const [congregation] = await db
    .select({ name: congregations.name })
    .from(congregations)
    .where(eq(congregations.id, id))
    .limit(1);

  const isApproved = status === MemberStatus.ACTIVE;
  await db.insert(notifications).values({
    userId: member.userId,
    type: isApproved ? NotificationType.JOIN_APPROVED : NotificationType.JOIN_REJECTED,
    title: isApproved ? 'Join Request Approved 🎉' : 'Join Request Not Approved',
    body: isApproved
      ? `Your request to join ${congregation?.name ?? 'the congregation'} has been approved. Sign in to access your congregation.`
      : `Your request to join ${congregation?.name ?? 'the congregation'} was not approved.${reviewNote ? ` Note: ${reviewNote}` : ''}`,
    data: JSON.stringify({ congregationId: id, memberId: requestId }),
  });

  return NextResponse.json({ data: updated });
}
