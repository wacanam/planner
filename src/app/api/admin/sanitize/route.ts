// src/app/api/admin/sanitize/route.ts

import { type NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/schema';
import { isSystemAdmin } from '@/lib/permissions';
import { runPrivacySanitizer } from '@/lib/privacy/privacy-sanitizer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'super_admin', 'admin'];

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate caller via Bearer token
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid authentication token.' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    let decodedToken: any;
    try {
      decodedToken = await getAdminAuth().verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or expired authentication token.' },
        { status: 401 }
      );
    }

    const callerUid = decodedToken.uid;
    const db = getAdminDb();
    const callerDoc = await db.collection(FIRESTORE_COLLECTIONS.users).doc(callerUid).get();

    if (!callerDoc.exists) {
      return NextResponse.json({ error: 'Caller user record not found.' }, { status: 403 });
    }

    const callerData = callerDoc.data() || {};
    const callerRole = String(callerData.role || '').toUpperCase();
    const isCallerAdmin = ADMIN_ROLES.includes(callerRole) || isSystemAdmin(callerRole);

    if (!isCallerAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin or Super Admin privileges required.' },
        { status: 403 }
      );
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const mode: 'dry_run' | 'execute' = body.mode === 'execute' ? 'execute' : 'dry_run';
    let congregationId: string | null = body.congregationId ?? null;
    const targets = Array.isArray(body.targets)
      ? body.targets
      : ['households', 'visits', 'encounters', 'territories', 'legacy'];

    // Enforce congregation boundaries for regular admins
    const isSuperAdmin = callerRole === 'SUPER_ADMIN' || callerRole === 'super_admin';
    if (!isSuperAdmin) {
      // Regular admin is confined to their own congregation
      congregationId = callerData.congregationId || null;
      if (!congregationId) {
        return NextResponse.json(
          { error: 'Admin is not assigned to a congregation.' },
          { status: 400 }
        );
      }
    }

    // 3. Run Privacy Sanitizer
    const report = await runPrivacySanitizer({
      mode,
      congregationId,
      targets,
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: any) {
    console.error('Privacy sanitizer API error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error while running sanitizer.' },
      { status: 500 }
    );
  }
}
