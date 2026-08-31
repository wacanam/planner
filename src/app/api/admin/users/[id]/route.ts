import { type NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'super_admin', 'admin'];

interface TransferRecipient {
  userId: string;
  name: string;
  roleTitle: string;
}

/**
 * Resolves the active Service Overseer for the given congregation.
 * Falls back to other congregation servants or the calling admin if no Service Overseer is registered.
 */
async function resolveServiceOverseer(
  db: FirebaseFirestore.Firestore,
  congregationId: string | null | undefined,
  fallbackUserId: string
): Promise<TransferRecipient> {
  if (congregationId) {
    const memberSnap = await db
      .collection(FIRESTORE_COLLECTIONS.congregationMembers)
      .where('congregationId', '==', congregationId)
      .where('status', 'in', ['active', 'approved'])
      .get();

    let serviceOverseerId: string | null = null;
    let fallbackServantId: string | null = null;

    for (const mDoc of memberSnap.docs) {
      const data = mDoc.data();
      const mUserId = data.userId || mDoc.id;
      const roleStr = String(data.congregationRole || data.role || '').toUpperCase();

      if (roleStr === 'SERVICE_OVERSEER') {
        serviceOverseerId = mUserId;
        break;
      }
      if (
        !fallbackServantId &&
        ['SECRETARY', 'TERRITORY_SERVANT', 'CIRCUIT_OVERSEER', 'ADMIN', 'SUPER_ADMIN'].includes(
          roleStr
        )
      ) {
        fallbackServantId = mUserId;
      }
    }

    const candidateId = serviceOverseerId || fallbackServantId;
    if (candidateId) {
      const userDoc = await db.collection(FIRESTORE_COLLECTIONS.users).doc(candidateId).get();
      const userData = userDoc.data();
      const name =
        userData?.name || (serviceOverseerId ? 'Service Overseer' : 'Congregation Servant');
      return {
        userId: candidateId,
        name,
        roleTitle: serviceOverseerId ? 'Service Overseer' : 'Congregation Servant',
      };
    }
  }

  // Fallback to the deleting Administrator
  const fallbackUserDoc = await db
    .collection(FIRESTORE_COLLECTIONS.users)
    .doc(fallbackUserId)
    .get();
  const fallbackData = fallbackUserDoc.data();
  return {
    userId: fallbackUserId,
    name: fallbackData?.name || 'Administrator',
    roleTitle: 'System Administrator',
  };
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetUserId } = await params;

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required.' }, { status: 400 });
    }

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
    } catch (err: any) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or expired authentication token.' },
        { status: 401 }
      );
    }

    const callerUid = decodedToken.uid;

    // Prevent self-deletion
    if (callerUid === targetUserId) {
      return NextResponse.json(
        { error: 'You cannot delete your own administrator account.' },
        { status: 400 }
      );
    }

    // 2. Authorize caller - Must be a System Administrator
    const db = getAdminDb();
    let isAuthorized = ADMIN_ROLES.includes(decodedToken.role);
    if (!isAuthorized) {
      const callerDoc = await db.collection(FIRESTORE_COLLECTIONS.users).doc(callerUid).get();
      const callerRole = callerDoc.data()?.role;
      if (callerRole && ADMIN_ROLES.includes(callerRole)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Forbidden: Super Administrator access is required to delete users.' },
        { status: 403 }
      );
    }

    // 3. Parse optional requested transfer recipient
    const body = await req.json().catch(() => ({}));
    const requestedRecipientId =
      body?.transferRecipientId || req.nextUrl.searchParams.get('transferRecipientId');

    // 4. Retrieve target user document to identify congregation
    const targetUserDocRef = db.collection(FIRESTORE_COLLECTIONS.users).doc(targetUserId);
    const targetUserSnap = await targetUserDocRef.get();
    const targetUserData = targetUserSnap.data();

    let congregationId: string | null | undefined = targetUserData?.congregationId;
    if (!congregationId) {
      const memberQuery = await db
        .collection(FIRESTORE_COLLECTIONS.congregationMembers)
        .where('userId', '==', targetUserId)
        .limit(1)
        .get();
      if (!memberQuery.empty) {
        congregationId = memberQuery.docs[0].data().congregationId;
      }
    }

    // 5. Determine the transfer recipient (Admin-selected recipient or Service Overseer)
    let recipient: TransferRecipient;
    if (requestedRecipientId && requestedRecipientId !== targetUserId) {
      const customUserDoc = await db
        .collection(FIRESTORE_COLLECTIONS.users)
        .doc(requestedRecipientId)
        .get();
      if (customUserDoc.exists) {
        const rData = customUserDoc.data();
        recipient = {
          userId: requestedRecipientId,
          name: rData?.name || rData?.email || 'Selected Publisher',
          roleTitle: rData?.role || 'Publisher',
        };
      } else {
        recipient = await resolveServiceOverseer(db, congregationId, callerUid);
      }
    } else {
      recipient = await resolveServiceOverseer(db, congregationId, callerUid);
    }

    // 6. Delete from Firebase Authentication
    try {
      await getAdminAuth().deleteUser(targetUserId);
    } catch (authErr: any) {
      if (authErr.code !== 'auth/user-not-found') {
        console.warn('[Delete User] Firebase Auth deletion warning:', authErr);
      }
    }

    // 7. Clean up & Transfer Firestore Records
    let batch = db.batch();
    let batchCount = 0;

    const commitBatchIfNeeded = async () => {
      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    };

    const now = nowIso();

    // 7a. Delete User profile document
    batch.delete(targetUserDocRef);
    batchCount++;

    // 7b. Delete Congregation Members documents
    const memberDocRef = db.collection(FIRESTORE_COLLECTIONS.congregationMembers).doc(targetUserId);
    batch.delete(memberDocRef);
    batchCount++;

    const memberQueries = await db
      .collection(FIRESTORE_COLLECTIONS.congregationMembers)
      .where('userId', '==', targetUserId)
      .get();
    for (const doc of memberQueries.docs) {
      batch.delete(doc.ref);
      batchCount++;
      await commitBatchIfNeeded();
    }

    // 7c. Delete Notifications
    const notifUserSnap = await db
      .collection(FIRESTORE_COLLECTIONS.notifications)
      .where('userId', '==', targetUserId)
      .get();
    for (const doc of notifUserSnap.docs) {
      batch.delete(doc.ref);
      batchCount++;
      await commitBatchIfNeeded();
    }

    // 7d. Delete Account Requests
    const accountReqSnap = await db
      .collection(FIRESTORE_COLLECTIONS.accountRequests)
      .where('userId', '==', targetUserId)
      .get();
    for (const doc of accountReqSnap.docs) {
      batch.delete(doc.ref);
      batchCount++;
      await commitBatchIfNeeded();
    }

    // 7e. Delete Territory Requests
    const terrReqPublisherSnap = await db
      .collection(FIRESTORE_COLLECTIONS.territoryRequests)
      .where('publisherId', '==', targetUserId)
      .get();
    for (const doc of terrReqPublisherSnap.docs) {
      batch.delete(doc.ref);
      batchCount++;
      await commitBatchIfNeeded();
    }
    const terrReqUserSnap = await db
      .collection(FIRESTORE_COLLECTIONS.territoryRequests)
      .where('userId', '==', targetUserId)
      .get();
    for (const doc of terrReqUserSnap.docs) {
      batch.delete(doc.ref);
      batchCount++;
      await commitBatchIfNeeded();
    }

    // 7f. Delete Assignments
    const assignUserSnap = await db
      .collection(FIRESTORE_COLLECTIONS.assignments)
      .where('userId', '==', targetUserId)
      .get();
    for (const doc of assignUserSnap.docs) {
      batch.delete(doc.ref);
      batchCount++;
      await commitBatchIfNeeded();
    }

    // 7g. Delete Shares (incoming & outgoing)
    const sharesFromSnap = await db
      .collection(FIRESTORE_COLLECTIONS.shares)
      .where('fromUserId', '==', targetUserId)
      .get();
    for (const doc of sharesFromSnap.docs) {
      batch.delete(doc.ref);
      batchCount++;
      await commitBatchIfNeeded();
    }
    const sharesToSnap = await db
      .collection(FIRESTORE_COLLECTIONS.shares)
      .where('toUserId', '==', targetUserId)
      .get();
    for (const doc of sharesToSnap.docs) {
      batch.delete(doc.ref);
      batchCount++;
      await commitBatchIfNeeded();
    }

    // 7h. Delete Member Locations
    const locDocRef = db.collection(FIRESTORE_COLLECTIONS.memberLocations).doc(targetUserId);
    batch.delete(locDocRef);
    batchCount++;
    const locSnap = await db
      .collection(FIRESTORE_COLLECTIONS.memberLocations)
      .where('userId', '==', targetUserId)
      .get();
    for (const doc of locSnap.docs) {
      batch.delete(doc.ref);
      batchCount++;
      await commitBatchIfNeeded();
    }

    // 7i. Release territories currently assigned to this user
    const terrSnap = await db
      .collection(FIRESTORE_COLLECTIONS.territories)
      .where('assignedPublisherId', '==', targetUserId)
      .get();
    for (const doc of terrSnap.docs) {
      batch.update(doc.ref, {
        assignedPublisherId: null,
        assignedPublisherName: null,
        assignedDate: null,
        dueDate: null,
        status: 'available',
        updatedAt: now,
      });
      batchCount++;
      await commitBatchIfNeeded();
    }

    // 7j. Remove user from Groups
    const groupsSnap = await db.collection(FIRESTORE_COLLECTIONS.groups).get();
    for (const doc of groupsSnap.docs) {
      const gData = doc.data();
      let modified = false;
      const updates: Record<string, any> = {};

      if (Array.isArray(gData.members)) {
        const filteredMembers = gData.members.filter(
          (m: any) => m.userId !== targetUserId && m.id !== targetUserId
        );
        if (filteredMembers.length !== gData.members.length) {
          updates.members = filteredMembers;
          modified = true;
        }
      }

      if (gData.overseerId === targetUserId) {
        updates.overseerId = null;
        updates.overseerName = null;
        modified = true;
      }
      if (gData.assistantOverseerId === targetUserId) {
        updates.assistantOverseerId = null;
        updates.assistantOverseerName = null;
        modified = true;
      }

      if (modified) {
        updates.updatedAt = now;
        batch.update(doc.ref, updates);
        batchCount++;
        await commitBatchIfNeeded();
      }
    }

    // ─── 7k. Transfer Households to Recipient ─────────────────────────────────
    const householdsSnap = await db
      .collection(FIRESTORE_COLLECTIONS.households)
      .where('createdById', '==', targetUserId)
      .get();
    for (const doc of householdsSnap.docs) {
      batch.update(doc.ref, {
        createdById: recipient.userId,
        creatorName: recipient.name,
        transferredFromId: targetUserId,
        transferredAt: now,
        updatedAt: now,
      });
      batchCount++;
      await commitBatchIfNeeded();
    }

    // Clean up households collaborator & readOnlyUser lists
    const houseCollabSnap = await db
      .collection(FIRESTORE_COLLECTIONS.households)
      .where('collaboratorIds', 'array-contains', targetUserId)
      .get();
    for (const doc of houseCollabSnap.docs) {
      const hData = doc.data();
      const collabs = (hData.collaboratorIds || []).filter((id: string) => id !== targetUserId);
      batch.update(doc.ref, { collaboratorIds: collabs, updatedAt: now });
      batchCount++;
      await commitBatchIfNeeded();
    }

    // ─── 7l. Transfer Visits to Recipient ─────────────────────────────────────
    const visitsSnap = await db
      .collection(FIRESTORE_COLLECTIONS.visits)
      .where('userId', '==', targetUserId)
      .get();
    for (const doc of visitsSnap.docs) {
      batch.update(doc.ref, {
        userId: recipient.userId,
        updatedAt: now,
      });
      batchCount++;
      await commitBatchIfNeeded();
    }

    // ─── 7m. Transfer Encounters to Recipient ─────────────────────────────────
    const encountersSnap = await db
      .collection(FIRESTORE_COLLECTIONS.encounters)
      .where('userId', '==', targetUserId)
      .get();
    for (const doc of encountersSnap.docs) {
      batch.update(doc.ref, {
        userId: recipient.userId,
        updatedAt: now,
      });
      batchCount++;
      await commitBatchIfNeeded();
    }

    // ─── 7n. Transfer Contacts to Recipient ───────────────────────────────────
    const contactsSnap = await db
      .collection(FIRESTORE_COLLECTIONS.contacts)
      .where('createdById', '==', targetUserId)
      .get();
    for (const doc of contactsSnap.docs) {
      batch.update(doc.ref, {
        createdById: recipient.userId,
        creatorName: recipient.name,
        updatedAt: now,
      });
      batchCount++;
      await commitBatchIfNeeded();
    }

    // Commit any remaining writes in the batch
    if (batchCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message: `User account deleted successfully. Ministry records (households, visits, encounters) were transferred to ${recipient.name} (${recipient.roleTitle}).`,
      transferredTo: recipient,
    });
  } catch (error: any) {
    console.error('[Admin Delete User Error]', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred while deleting the user.' },
      { status: 500 }
    );
  }
}
