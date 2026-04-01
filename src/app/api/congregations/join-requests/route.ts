import { type NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import {
  db,
  congregations,
  congregationMembers,
  notifications,
  MemberStatus,
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

  const [congregation] = await db
    .select()
    .from(congregations)
    .where(eq(congregations.id, congregationId))
    .limit(1);

  if (!congregation) {
    return NextResponse.json({ error: 'Congregation not found.' }, { status: 404 });
  }

  // Already a member (active or pending)
  const [existing] = await db
    .select()
    .from(congregationMembers)
    .where(
      and(
        eq(congregationMembers.userId, user.userId),
        eq(congregationMembers.congregationId, congregationId)
      )
    )
    .limit(1);

  if (existing) {
    const msg =
      existing.status === MemberStatus.ACTIVE
        ? 'You are already a member of this congregation.'
        : 'You already have a pending join request for this congregation.';
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  // Insert as pending member
  const [member] = await db
    .insert(congregationMembers)
    .values({
      userId: user.userId,
      congregationId,
      status: MemberStatus.PENDING,
      joinMessage: message?.trim() || null,
    })
    .returning();

  // Notify service overseers and territory servants
  const privileged = await db
    .select({ userId: congregationMembers.userId, role: congregationMembers.congregationRole })
    .from(congregationMembers)
    .where(
      and(
        eq(congregationMembers.congregationId, congregationId),
        eq(congregationMembers.status, MemberStatus.ACTIVE)
      )
    );

  const toNotify = privileged.filter(
    (m) =>
      m.role === CongregationRole.SERVICE_OVERSEER || m.role === CongregationRole.TERRITORY_SERVANT
  );

  if (toNotify.length > 0) {
    await db.insert(notifications).values(
      toNotify.map((m) => ({
        userId: m.userId,
        type: NotificationType.JOIN_REQUEST,
        title: 'New Join Request',
        body: `Someone wants to join ${congregation.name}. Review their request.`,
        data: JSON.stringify({
          memberId: member.id,
          congregationId,
          requestUserId: user.userId,
        }),
      }))
    );
  }

  return NextResponse.json({ data: member }, { status: 201 });
}

// GET /api/congregations/join-requests — current user's own join requests
export async function GET(req: NextRequest) {
  const auth = withAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const requests = await db
    .select({
      id: congregationMembers.id,
      congregationId: congregationMembers.congregationId,
      status: congregationMembers.status,
      joinMessage: congregationMembers.joinMessage,
      reviewNote: congregationMembers.reviewNote,
      joinedAt: congregationMembers.joinedAt,
      reviewedAt: congregationMembers.reviewedAt,
      congregation: {
        id: congregations.id,
        name: congregations.name,
        city: congregations.city,
        country: congregations.country,
      },
    })
    .from(congregationMembers)
    .leftJoin(congregations, eq(congregationMembers.congregationId, congregations.id))
    .where(
      and(
        eq(congregationMembers.userId, user.userId),
        eq(congregationMembers.status, MemberStatus.PENDING)
      )
    );

  return NextResponse.json({ data: requests });
}
