import { type NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { withAuth, withCongregationAuth } from '@/lib/auth-middleware';
import { db, congregations, UserRole } from '@/db';

// GET /api/congregations/:id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await withCongregationAuth(req, id);
  if (auth instanceof NextResponse) return auth;

  const [congregation] = await db
    .select()
    .from(congregations)
    .where(eq(congregations.id, id))
    .limit(1);

  if (!congregation) {
    return NextResponse.json({ error: 'Congregation not found' }, { status: 404 });
  }

  return NextResponse.json({ data: congregation });
}

// PATCH /api/congregations/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = withAuth(req, UserRole.ADMIN);
  if (auth instanceof NextResponse) return auth;

  const [congregation] = await db
    .select()
    .from(congregations)
    .where(eq(congregations.id, id))
    .limit(1);

  if (!congregation) {
    return NextResponse.json({ error: 'Congregation not found' }, { status: 404 });
  }

  const body = await req.json();
  const { name, city, country, status } = body;

  const [updated] = await db
    .update(congregations)
    .set({
      ...(name ? { name } : {}),
      ...(city !== undefined ? { city } : {}),
      ...(country !== undefined ? { country } : {}),
      ...(status ? { status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(congregations.id, id))
    .returning();

  return NextResponse.json({ data: updated });
}

// DELETE /api/congregations/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = withAuth(req, UserRole.SUPER_ADMIN);
  if (auth instanceof NextResponse) return auth;

  const [congregation] = await db
    .select()
    .from(congregations)
    .where(eq(congregations.id, id))
    .limit(1);

  if (!congregation) {
    return NextResponse.json({ error: 'Congregation not found' }, { status: 404 });
  }

  await db.delete(congregations).where(eq(congregations.id, id));

  return NextResponse.json({ success: true });
}
