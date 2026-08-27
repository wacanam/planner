import { type NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'super_admin', 'admin'];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required.' }, { status: 400 });
    }

    // 1. Authenticate the caller via Bearer token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid authentication token.' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    let decodedToken: any;
    try {
      decodedToken = await getAdminAuth().verifyIdToken(idToken);
    } catch (err: any) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or expired authentication token.' },
        { status: 401 }
      );
    }

    const callerUid = decodedToken.uid;

    // 2. Authorize caller - Must be a System Administrator
    let isAuthorized = ADMIN_ROLES.includes(decodedToken.role);
    if (!isAuthorized) {
      const callerDoc = await getAdminDb()
        .collection(FIRESTORE_COLLECTIONS.users)
        .doc(callerUid)
        .get();
      const callerRole = callerDoc.data()?.role;
      if (callerRole && ADMIN_ROLES.includes(callerRole)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Forbidden: Super Administrator access is required for this action.' },
        { status: 403 }
      );
    }

    // 3. Parse and validate body
    const body = await req.json().catch(() => ({}));
    const { newEmail, sendPasswordReset = true } = body;

    if (!newEmail || typeof newEmail !== 'string' || !newEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Please provide a valid new email address.' },
        { status: 400 }
      );
    }

    const normalizedEmail = newEmail.trim().toLowerCase();

    // 4. Update Firebase Auth record
    await getAdminAuth().updateUser(targetUserId, {
      email: normalizedEmail,
      emailVerified: false,
    });

    // 5. Revoke existing refresh tokens so old sessions cannot refresh
    await getAdminAuth().revokeRefreshTokens(targetUserId).catch(() => undefined);

    // 6. Update Firestore user document
    const now = nowIso();
    const userDocRef = getAdminDb().collection(FIRESTORE_COLLECTIONS.users).doc(targetUserId);
    await userDocRef.set(
      {
        email: normalizedEmail,
        updatedAt: now,
      },
      { merge: true }
    );

    // 7. Update congregationMembers document if it exists and has email
    const memberDocRef = getAdminDb()
      .collection(FIRESTORE_COLLECTIONS.congregationMembers)
      .doc(targetUserId);
    const memberSnap = await memberDocRef.get();
    if (memberSnap.exists) {
      await memberDocRef.update({
        email: normalizedEmail,
        updatedAt: now,
      }).catch(() => undefined);
    }

    // 8. Generate password reset link if requested
    let resetLink: string | null = null;
    if (sendPasswordReset) {
      try {
        resetLink = await getAdminAuth().generatePasswordResetLink(normalizedEmail);
      } catch (linkErr) {
        console.warn('[Admin Replace Email] Could not generate password reset link:', linkErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User email updated successfully.',
      newEmail: normalizedEmail,
      resetLink,
    });
  } catch (error: any) {
    console.error('[Admin Replace Email Error]', error);

    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'This email address is already in use by another account.' },
        { status: 409 }
      );
    }
    if (error.code === 'auth/invalid-email') {
      return NextResponse.json(
        { error: 'The email address provided is invalid.' },
        { status: 400 }
      );
    }
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'User not found in Firebase Authentication.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred while updating the user email.' },
      { status: 500 }
    );
  }
}
