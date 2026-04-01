import { type NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import {
  db,
  congregations,
  congregationMembers,
  congregationJoinRequests,
  notifications,
  JoinRequestStatus,
  CongregationRole,
  NotificationType,
} from '@/db';

// POST /api/congregations/join-requests — submit a join request
export async function POST(req: NextRequest) {
  const auth = withAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json();
  const { congregationId, message } = body;

  if (!congregationId) {
    return NextResponse.json({ error: 'congregationId is required.' }, { status: 400 });
  }

  // Verify congregation exists
  const [congregation] = await db
    .select()
    .from(congregations)
    .where(eq(congregations.id, congregationId))
    .limit(1);

  if (!congregation) {
    return NextResponse.json({ error: 'Congregation not found.' }, { status: 404 });
  }

  // Check already a member
  const [existingMember] = await db
    .select({ id: congregationMembers.id })
    .from(congregationMembers)
    .where(
      and(
        eq(congregationMembers.userId, user.userId),
        eq(congregationMembers.congregationId, congregationId)
      )
    )
    .limit(1);

  if (existingMember) {
    return NextResponse.json(
      { error: 'You are already a member of this congregation.' },
      { status: 409 }
    );
  }

  // Check for existing pending request
  const [existingRequest] = await db
    .select({ id: congregationJoinRequests.id })
    .from(congregationJoinRequests)
    .where(
      and(
        eq(congregationJoinRequests.userId, user.userId),
        eq(congregationJoinRequests.congregationId, congregationId),
        eq(congregationJoinRequests.status, JoinRequestStatus.PENDING)
      )
    )
    .limit(1);

  if (existingRequest) {
    return NextResponse.json(
      { error: 'You already have a pending join request for this congregation.' },
      { status: 409 }
    );
  }

  // Create the join request
  const [joinRequest] = await db
    .insert(congregationJoinRequests)
    .values({
      congregationId,
      userId: user.userId,
      message: message?.trim() || null,
      status: JoinRequestStatus.PENDING,
    })
    .returning();

  // Notify all service overseers and territory servants in this congregation
  const privilegedMembers = await db
    .select({ userId: congregationMembers.userId, role: congregationMembers.congregationRole })
    .from(congregationMembers)
    .where(eq(congregationMembers.congregationId, congregationId));

  const toNotify = privilegedMembers.filter(
    (m) =>
      m.role === CongregationRole.SERVICE_OVERSEER ||
      m.role === CongregationRole.TERRITORY_SERVANT
  );

  if (toNotify.length > 0) {
    await db.insert(notifications).values(
      toNotify.map((m) => ({
        userId: m.userId,
        type: NotificationType.JOIN_REQUEST,
        title: 'New Join Request',
        body: `Someone wants to join ${congregation.name}. Review their request.`,
        data: JSON.stringify({
          joinRequestId: joinRequest.id,
          congregationId,
          requestUserId: user.userId,
        }),
      }))
    );
  }

  return NextResponse.json({ data: joinRequest }, { status: 201 });
}

// GET /api/congregations/join-requests — get current user's own join requests
export async function GET(req: NextRequest) {
  const auth = withAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const requests = await db
    .select({
      id: congregationJoinRequests.id,
      congregationId: congregationJoinRequests.congregationId,
      status: congregationJoinRequests.status,
      message: congregationJoinRequests.message,
      reviewNote: congregationJoinRequests.reviewNote,
      requestedAt: congregationJoinRequests.requestedAt,
      reviewedAt: congregationJoinRequests.reviewedAt,
      congregation: {
        id: congregations.id,
        name: congregations.name,
        city: congregations.city,
        country: congregations.country,
      },
    })
    .from(congregationJoinRequests)
    .leftJoin(congregations, eq(congregationJoinRequests.congregationId, congregations.id))
    .where(eq(congregationJoinRequests.userId, user.userId))
    .orderBy(congregationJoinRequests.requestedAt);

  return NextResponse.json({ data: requests });
}
