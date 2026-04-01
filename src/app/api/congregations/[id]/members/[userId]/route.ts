import { type NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { withCongregationAuth } from '@/lib/auth-middleware';
import { db, congregationMembers, CongregationRole } from '@/db';

// PATCH /api/congregations/:id/members/:userId
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params;

  const auth = await withCongregationAuth(req, id, CongregationRole.SERVICE_OVERSEER);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { congregationRole } = body;

  const validRoles = [CongregationRole.SERVICE_OVERSEER, CongregationRole.TERRITORY_SERVANT, null];
  if (!validRoles.includes(congregationRole)) {
    return NextResponse.json(
      { error: 'Invalid role. Must be service_overseer, territory_servant, or null' },
      { status: 400 }
    );
  }

  const [member] = await db
    .select()
    .from(congregationMembers)
    .where(and(eq(congregationMembers.userId, userId), eq(congregationMembers.congregationId, id)))
    .limit(1);

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const [updated] = await db
    .update(congregationMembers)
    .set({ congregationRole })
    .where(eq(congregationMembers.id, member.id))
    .returning();

  return NextResponse.json({ data: updated });
}
