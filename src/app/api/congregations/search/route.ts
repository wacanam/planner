import { type NextRequest, NextResponse } from 'next/server';
import { ilike, or } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { db, congregations } from '@/db';

// GET /api/congregations/search?q=...
export async function GET(req: NextRequest) {
  const auth = withAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters.' }, { status: 400 });
  }

  const results = await db
    .select({
      id: congregations.id,
      name: congregations.name,
      slug: congregations.slug,
      city: congregations.city,
      country: congregations.country,
      status: congregations.status,
    })
    .from(congregations)
    .where(
      or(
        ilike(congregations.name, `%${q}%`),
        ilike(congregations.city, `%${q}%`),
        ilike(congregations.slug, `%${q}%`)
      )
    )
    .limit(10);

  const active = results.filter((c) => c.status === 'active');

  return NextResponse.json({ data: active });
}
