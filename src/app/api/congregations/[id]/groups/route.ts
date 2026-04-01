import { type NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { withCongregationAuth } from '@/lib/auth-middleware';
import { db, groups, groupMembers, users, CongregationRole } from '@/db';

// GET /api/congregations/:id/groups
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id);
  if (auth instanceof NextResponse) return auth;

  const rows = await db
    .select({
      id: groups.id,
      congregationId: groups.congregationId,
      name: groups.name,
      createdAt: groups.createdAt,
    })
    .from(groups)
    .where(eq(groups.congregationId, id));

  return NextResponse.json({ data: rows });
}

// POST /api/congregations/:id/groups
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id, CongregationRole.SERVICE_OVERSEER);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { name } = body;

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const [group] = await db
    .insert(groups)
    .values({ congregationId: id, name })
    .returning();

  return NextResponse.json({ data: group }, { status: 201 });
}
