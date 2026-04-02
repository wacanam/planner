import { type NextRequest, NextResponse } from 'next/server';
import { eq, and, inArray, gte } from 'drizzle-orm';
import {
  db,
  territories,
  users,
  territoryAssignments,
  UserRole,
  CongregationRole,
  AssignmentStatus,
} from '@/db';
import { withCongregationAuth } from '@/lib/auth-middleware';

// GET /api/congregations/:id/reports/activity
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
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const territoryRows = await db
      .select({ id: territories.id })
      .from(territories)
      .where(eq(territories.congregationId, congregationId));

    const territoryIds = territoryRows.map((t) => t.id);

    if (territoryIds.length === 0) {
      return NextResponse.json({ data: { assignments: [], returns: [] } });
    }

    const allAssignments = await db
      .select({
        id: territoryAssignments.id,
        status: territoryAssignments.status,
        assignedAt: territoryAssignments.assignedAt,
        returnedAt: territoryAssignments.returnedAt,
        coverageAtAssignment: territoryAssignments.coverageAtAssignment,
        territoryName: territories.name,
        territoryNumber: territories.number,
        publisherName: users.name,
      })
      .from(territoryAssignments)
      .leftJoin(territories, eq(territoryAssignments.territoryId, territories.id))
      .leftJoin(users, eq(territoryAssignments.userId, users.id))
      .where(
        and(
          inArray(territoryAssignments.territoryId, territoryIds),
          gte(territoryAssignments.assignedAt, thirtyDaysAgo)
        )
      );

    const assignments = allAssignments
      .filter((a) => a.assignedAt !== null)
      .map((a) => ({
        id: a.id,
        territoryName: a.territoryName ?? '',
        territoryNumber: a.territoryNumber ?? '',
        publisherName: a.publisherName ?? '',
        assignedAt: a.assignedAt,
      }));

    const returns = allAssignments
      .filter(
        (a) =>
          (a.status === AssignmentStatus.RETURNED || a.status === AssignmentStatus.COMPLETED) &&
          a.returnedAt !== null
      )
      .map((a) => ({
        id: a.id,
        territoryName: a.territoryName ?? '',
        territoryNumber: a.territoryNumber ?? '',
        publisherName: a.publisherName ?? '',
        returnedAt: a.returnedAt,
        coverageAtAssignment: Number(a.coverageAtAssignment),
      }));

    return NextResponse.json({ data: { assignments, returns } });
  } catch (err) {
    console.error('[GET /api/congregations/:id/reports/activity]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
