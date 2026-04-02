import { type NextRequest, NextResponse } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import {
  db,
  territories,
  users,
  congregationMembers,
  territoryAssignments,
  UserRole,
  CongregationRole,
  AssignmentStatus,
  MemberStatus,
} from '@/db';
import { withCongregationAuth } from '@/lib/auth-middleware';

// GET /api/congregations/:id/reports/publishers
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: congregationId } = await params;
  const auth = await withCongregationAuth(req, congregationId);
  if (auth instanceof NextResponse) return auth;

  const { user, member } = auth;

  const isAllowed =
    user.role === UserRole.SUPER_ADMIN ||
    user.role === UserRole.ADMIN ||
    member?.congregationRole === CongregationRole.SERVICE_OVERSEER ||
    member?.congregationRole === CongregationRole.TERRITORY_SERVANT;

  if (!isAllowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const members = await db
      .select({
        userId: congregationMembers.userId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(congregationMembers)
      .leftJoin(users, eq(congregationMembers.userId, users.id))
      .where(
        and(
          eq(congregationMembers.congregationId, congregationId),
          eq(congregationMembers.status, MemberStatus.ACTIVE)
        )
      );

    if (members.length === 0) {
      return NextResponse.json({ data: { publishers: [] } });
    }

    const userIds = members.map((m) => m.userId);

    const assignments = await db
      .select({
        id: territoryAssignments.id,
        userId: territoryAssignments.userId,
        status: territoryAssignments.status,
        territoryName: territories.name,
        territoryNumber: territories.number,
      })
      .from(territoryAssignments)
      .leftJoin(territories, eq(territoryAssignments.territoryId, territories.id))
      .where(
        and(
          inArray(territoryAssignments.userId, userIds),
          eq(territories.congregationId, congregationId)
        )
      );

    const publishers = members.map((m) => {
      const userAssignments = assignments.filter((a) => a.userId === m.userId);
      const activeAssignments = userAssignments.filter((a) => a.status === AssignmentStatus.ACTIVE);
      const completedAssignments = userAssignments.filter(
        (a) =>
          a.status === AssignmentStatus.COMPLETED || a.status === AssignmentStatus.RETURNED
      );

      return {
        userId: m.userId,
        name: m.userName ?? '',
        email: m.userEmail ?? '',
        activeAssignments: activeAssignments.length,
        totalCompleted: completedAssignments.length,
        territories: activeAssignments.map((a) => `${a.territoryNumber} - ${a.territoryName}`),
      };
    });

    return NextResponse.json({ data: { publishers } });
  } catch (err) {
    console.error('[GET /api/congregations/:id/reports/publishers]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
