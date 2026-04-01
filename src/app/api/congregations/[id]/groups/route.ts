import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { CongregationRole, db, groupMembers, groups, users } from '@/db';
import { withCongregationAuth } from '@/lib/auth-middleware';

interface GroupResponse {
  id: string;
  congregationId: string;
  name: string;
  createdAt: Date;
  members: Array<{
    id: string;
    userId: string;
    user: {
      name: string | null;
      email: string | null;
    };
  }>;
}

// GET /api/congregations/:id/groups
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id);
  if (auth instanceof NextResponse) return auth;

  // Single query: fetch groups with members and user details via joins
  const rows = await db
    .select({
      groupId: groups.id,
      congregationId: groups.congregationId,
      groupName: groups.name,
      groupCreatedAt: groups.createdAt,
      memberId: groupMembers.id,
      userId: groupMembers.userId,
      userName: users.name,
      userEmail: users.email,
    })
    .from(groups)
    .leftJoin(groupMembers, eq(groups.id, groupMembers.groupId))
    .leftJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groups.congregationId, id));

  // Aggregate results into groups with members
  const groupMap = new Map<string, GroupResponse>();
  rows.forEach((row) => {
    if (!groupMap.has(row.groupId)) {
      groupMap.set(row.groupId, {
        id: row.groupId,
        congregationId: row.congregationId,
        name: row.groupName,
        createdAt: row.groupCreatedAt,
        members: [],
      });
    }

    if (row.memberId && row.userId) {
      const group = groupMap.get(row.groupId);
      if (group) {
        group.members.push({
          id: row.memberId,
          userId: row.userId,
          user: {
            name: row.userName,
            email: row.userEmail,
          },
        });
      }
    }
  });

  return NextResponse.json({ data: Array.from(groupMap.values()) });
}

// POST /api/congregations/:id/groups
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id, CongregationRole.SERVICE_OVERSEER);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { name } = body;

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const [group] = await db.insert(groups).values({ congregationId: id, name }).returning();

  return NextResponse.json({ data: group }, { status: 201 });
}
