import { type NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { withCongregationAuth } from '@/lib/auth-middleware';
import { db, territories, users, groups, CongregationRole, TerritoryStatus } from '@/db';

// GET /api/congregations/:id/territories
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id);
  if (auth instanceof NextResponse) return auth;

  const rows = await db
    .select({
      id: territories.id,
      number: territories.number,
      name: territories.name,
      notes: territories.notes,
      status: territories.status,
      householdsCount: territories.householdsCount,
      coveragePercent: territories.coveragePercent,
      congregationId: territories.congregationId,
      publisherId: territories.publisherId,
      groupId: territories.groupId,
      createdAt: territories.createdAt,
      updatedAt: territories.updatedAt,
      publisherName: users.name,
      groupName: groups.name,
    })
    .from(territories)
    .leftJoin(users, eq(territories.publisherId, users.id))
    .leftJoin(groups, eq(territories.groupId, groups.id))
    .where(eq(territories.congregationId, id));

  return NextResponse.json({ data: rows });
}

// POST /api/congregations/:id/territories
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id, CongregationRole.TERRITORY_SERVANT);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { name, number, notes, publisherId, groupId } = body;

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (publisherId && groupId) {
    return NextResponse.json(
      { error: 'A territory can only be assigned to a publisher OR a group, not both' },
      { status: 400 }
    );
  }

  const [territory] = await db
    .insert(territories)
    .values({
      congregationId: id,
      name,
      number: number ?? name,
      notes,
      publisherId: publisherId ?? null,
      groupId: groupId ?? null,
      status: publisherId || groupId ? TerritoryStatus.ASSIGNED : TerritoryStatus.AVAILABLE,
    })
    .returning();

  return NextResponse.json({ data: territory }, { status: 201 });
}
