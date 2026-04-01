import { type NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { withCongregationAuth } from '@/lib/auth-middleware';
import {
  db,
  congregations,
  congregationMembers,
  congregationJoinRequests,
  users,
  notifications,
  JoinRequestStatus,
  CongregationRole,
  NotificationType,
} from '@/db';

// PATCH /api/congregations/:id/join-requests/:requestId — approve or reject
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const { id, requestId } = await params;

  // Only service_overseer can approve/reject
  const auth = await withCongregationAuth(req, id, CongregationRole.SERVICE_OVERSEER);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json();
  const { status, reviewNote } = body as {
    status: JoinRequestStatus;
    reviewNote?: string;
  };

  if (!([JoinRequestStatus.APPROVED, JoinRequestStatus.REJECTED] as string[]).includes(status)) {
    return NextResponse.json(
      { error: 'status must be "approved" or "rejected".' },
      { status: 400 }
    );
  }

  const [joinRequest] = await db
    .select()
    .from(congregationJoinRequests)
    .where(
      and(
        eq(congregationJoinRequests.id, requestId),
        eq(congregationJoinRequests.congregationId, id)
      )
    )
    .limit(1);

  if (!joinRequest) {
    return NextResponse.json({ error: 'Join request not found.' }, { status: 404 });
  }

  if (joinRequest.status !== JoinRequestStatus.PENDING) {
    return NextResponse.json(
      { error: 'This request has already been reviewed.' },
      { status: 409 }
    );
  }

  // Update the request
  const [updated] = await db
    .update(congregationJoinRequests)
    .set({
      status,
      reviewedBy: user.userId,
      reviewedAt: new Date(),
      reviewNote: reviewNote?.trim() || null,
    })
    .where(eq(congregationJoinRequests.id, requestId))
    .returning();

  // If approved — add to congregation_members
  if (status === JoinRequestStatus.APPROVED) {
    const [alreadyMember] = await db
      .select({ id: congregationMembers.id })
      .from(congregationMembers)
      .where(
        and(
          eq(congregationMembers.userId, joinRequest.userId),
          eq(congregationMembers.congregationId, id)
        )
      )
      .limit(1);

    if (!alreadyMember) {
      await db.insert(congregationMembers).values({
        userId: joinRequest.userId,
        congregationId: id,
      });
    }
  }

  // Notify the requester
  const [congregation] = await db
    .select({ name: congregations.name })
    .from(congregations)
    .where(eq(congregations.id, id))
    .limit(1);

  const isApproved = status === JoinRequestStatus.APPROVED;
  await db.insert(notifications).values({
    userId: joinRequest.userId,
    type: isApproved ? NotificationType.JOIN_APPROVED : NotificationType.JOIN_REJECTED,
    title: isApproved ? 'Join Request Approved 🎉' : 'Join Request Not Approved',
    body: isApproved
      ? `Your request to join ${congregation?.name ?? 'the congregation'} has been approved. You can now sign in and access the congregation.`
      : `Your request to join ${congregation?.name ?? 'the congregation'} was not approved.${reviewNote ? ` Note: ${reviewNote}` : ''}`,
    data: JSON.stringify({ congregationId: id, joinRequestId: requestId }),
  });

  return NextResponse.json({ data: updated });
}
