import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/db';
import { withAuth } from '@/lib/auth-middleware';

// GET /api/profile
export async function GET(req: NextRequest) {
  const auth = withAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      congregationId: users.congregationId,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, user.userId))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ data: row });
}

// PATCH /api/profile
export async function PATCH(req: NextRequest) {
  const auth = withAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const [updated] = await db
    .update(users)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(users.id, user.userId))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      congregationId: users.congregationId,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  return NextResponse.json({ data: updated });
}
