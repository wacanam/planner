import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { congregations, db, UserRole } from '@/db';
import { withAuth, withCongregationAuth } from '@/lib/auth-middleware';

// GET /api/congregations/:id
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log('[GET /api/congregations/:id] Handling request for congregation:', id);

    const auth = await withCongregationAuth(req, id);
    if (auth instanceof NextResponse) {
      console.log('[GET /api/congregations/:id] Auth failed, returning response');
      return auth;
    }

    const [congregation] = await db
      .select()
      .from(congregations)
      .where(eq(congregations.id, id))
      .limit(1);

    if (!congregation) {
      return NextResponse.json({ error: 'Congregation not found' }, { status: 404 });
    }

    return NextResponse.json({ data: congregation });
  } catch (error) {
    console.error('[GET /api/congregations/:id] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/congregations/:id
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
