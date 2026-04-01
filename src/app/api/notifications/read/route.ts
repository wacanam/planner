import { type NextRequest, NextResponse } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { db, notifications } from '@/db';

// POST /api/notifications/read — mark notifications as read
// body: { ids: string[] } or {} to mark all
export async function POST(req: NextRequest) {
  const auth = withAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json().catch(() => ({}));
  const { ids } = body as { ids?: string[] };

  if (ids && ids.length > 0) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.userId, user.userId), inArray(notifications.id, ids))
      );
  } else {
    // Mark all as read
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, user.userId));
  }

  return NextResponse.json({ success: true });
}
