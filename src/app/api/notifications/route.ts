import { type NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { db, notifications } from '@/db';

// GET /api/notifications — get current user's notifications
export async function GET(req: NextRequest) {
  const auth = withAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get('unread') === 'true';

  const query = db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const results = await query;
  const filtered = unreadOnly ? results.filter((n) => !n.isRead) : results;

  return NextResponse.json({
    data: filtered,
    unreadCount: results.filter((n) => !n.isRead).length,
  });
}
