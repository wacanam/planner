import { type NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, territoryAssignments, users } from '@/db';
import { withAuth } from '@/lib/auth-middleware';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/territories/:id/assignments — get assignment history for a territory
export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = withAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;

  const rows = await db
    .select({
      id: territoryAssignments.id,
      territoryId: territoryAssignments.territoryId,
      userId: territoryAssignments.userId,
      serviceGroupId: territoryAssignments.serviceGroupId,
      status: territoryAssignments.status,
      assignedAt: territoryAssignments.assignedAt,
      dueAt: territoryAssignments.dueAt,
      returnedAt: territoryAssignments.returnedAt,
      notes: territoryAssignments.notes,
      coverageAtAssignment: territoryAssignments.coverageAtAssignment,
      createdAt: territoryAssignments.createdAt,
      assigneeName: users.name,
      assigneeEmail: users.email,
    })
    .from(territoryAssignments)
    .leftJoin(users, eq(territoryAssignments.userId, users.id))
    .where(eq(territoryAssignments.territoryId, id))
    .orderBy(territoryAssignments.createdAt);

  return NextResponse.json({ success: true, data: rows });
}
