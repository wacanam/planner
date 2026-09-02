import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { commitChunkedBatch, type BatchOperation } from '@/lib/firebase/batch-utils';
import { FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
import { InvitationStatus, InvitationType, NotificationType } from '@/lib/roles';
import type { Invitation } from '@/types/api';

function invitationCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.invitations);
}

function invitationDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.invitations, id);
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function useCongregationInvitations(congregationId: string | null | undefined) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(congregationId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!congregationId) {
      setInvitations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(
      invitationCollection(),
      where('congregationId', '==', congregationId),
      where('type', '==', InvitationType.CONGREGATION)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Invitation, 'id'>),
        }));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setInvitations(list);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [congregationId]);

  return { data: invitations, invitations, isLoading, error };
}

export function useSystemAdminInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(invitationCollection(), where('type', '==', InvitationType.SYSTEM_ADMIN));

    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Invitation, 'id'>),
        }));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setInvitations(list);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, []);

  return { data: invitations, invitations, isLoading, error };
}

export function useCreateInvitation() {
  const [isCreating, setIsCreating] = useState(false);

  const createCongregationInvitation = useCallback(
    async (arg: {
      congregationId: string;
      congregationName: string;
      email?: string | null;
      congregationRole: string;
      groupId?: string | null;
      groupName?: string | null;
      groupRole?: string | null;
      invitedBy: string;
      invitedByName: string;
      invitedByRole: string;
      expiresInDays?: number;
    }): Promise<Invitation> => {
      setIsCreating(true);
      try {
        const firestore = getPlannerFirestore();
        const code = generateInviteCode();
        const now = nowIso();
        const days = arg.expiresInDays || 14;
        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

        const invitationData: Invitation = {
          id: code,
          type: InvitationType.CONGREGATION,
          congregationId: arg.congregationId,
          congregationName: arg.congregationName,
          email: arg.email?.trim().toLowerCase() || null,
          congregationRole: arg.congregationRole,
          groupId: arg.groupId || null,
          groupName: arg.groupName || null,
          groupRole: arg.groupRole || null,
          invitedBy: arg.invitedBy,
          invitedByName: arg.invitedByName,
          invitedByRole: arg.invitedByRole,
          status: InvitationStatus.PENDING,
          createdAt: now,
          expiresAt,
        };

        await setDoc(invitationDocument(code), invitationData);

        if (arg.email?.trim()) {
          const mailDocRef = doc(collection(firestore, FIRESTORE_COLLECTIONS.mail));
          await setDoc(mailDocRef, {
            to: arg.email.trim(),
            message: {
              subject: `Invitation to join ${arg.congregationName} on Kanataran`,
              text: `You have been invited by ${arg.invitedByName} (${arg.invitedByRole}) to join ${arg.congregationName} on Kanataran as ${arg.congregationRole}.\n\nYour Invite Code is: ${code}\nOr use link: https://kanataran.app/invite?code=${code}\n\nThis invitation will expire in ${days} days.`,
              html: `
                <h2>You're invited to join ${arg.congregationName}!</h2>
                <p><strong>${arg.invitedByName}</strong> has invited you to join the congregation on <strong>Kanataran</strong> as <strong>${arg.congregationRole}</strong>${arg.groupName ? ` in <em>${arg.groupName}</em>` : ''}.</p>
                <p>Your invite code: <strong>${code}</strong></p>
                <p><a href="https://kanataran.app/invite?code=${code}" style="display:inline-block;padding:10px 20px;background-color:#0284c7;color:white;text-decoration:none;border-radius:6px;">Accept Invitation</a></p>
                <p><small>Expires on ${new Date(expiresAt).toLocaleDateString()}</small></p>
              `,
            },
            createdAt: now,
          }).catch(() => {});
        }

        return invitationData;
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  const createSystemAdminInvitation = useCallback(
    async (arg: {
      email?: string | null;
      systemRole: string;
      invitedBy: string;
      invitedByName: string;
      invitedByRole: string;
      expiresInDays?: number;
    }): Promise<Invitation> => {
      setIsCreating(true);
      try {
        const firestore = getPlannerFirestore();
        const code = generateInviteCode();
        const now = nowIso();
        const days = arg.expiresInDays || 14;
        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

        const invitationData: Invitation = {
          id: code,
          type: InvitationType.SYSTEM_ADMIN,
          systemRole: arg.systemRole,
          email: arg.email?.trim().toLowerCase() || null,
          invitedBy: arg.invitedBy,
          invitedByName: arg.invitedByName,
          invitedByRole: arg.invitedByRole,
          status: InvitationStatus.PENDING,
          createdAt: now,
          expiresAt,
        };

        await setDoc(invitationDocument(code), invitationData);

        if (arg.email?.trim()) {
          const mailDocRef = doc(collection(firestore, FIRESTORE_COLLECTIONS.mail));
          await setDoc(mailDocRef, {
            to: arg.email.trim(),
            message: {
              subject: 'Invitation to become an App Admin on Kanataran',
              text: `You have been invited by ${arg.invitedByName} to become an administrator (${arg.systemRole}) for Kanataran.\n\nYour Invite Code is: ${code}\nOr use link: https://kanataran.app/invite?code=${code}`,
              html: `
                <h2>App Administrator Invitation</h2>
                <p><strong>${arg.invitedByName}</strong> has invited you to become a <strong>${arg.systemRole}</strong> on <strong>Kanataran</strong>.</p>
                <p>Your invite code: <strong>${code}</strong></p>
                <p><a href="https://kanataran.app/invite?code=${code}" style="display:inline-block;padding:10px 20px;background-color:#0284c7;color:white;text-decoration:none;border-radius:6px;">Accept Invitation</a></p>
              `,
            },
            createdAt: now,
          }).catch(() => {});
        }

        return invitationData;
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  return { createCongregationInvitation, createSystemAdminInvitation, isCreating };
}

export function useRevokeInvitation() {
  const [isRevoking, setIsRevoking] = useState(false);

  const revoke = useCallback(async (invitationId: string) => {
    setIsRevoking(true);
    try {
      await updateDoc(invitationDocument(invitationId), {
        status: InvitationStatus.REVOKED,
        updatedAt: nowIso(),
      });
    } finally {
      setIsRevoking(false);
    }
  }, []);

  return { revoke, isRevoking };
}

export async function fetchInvitationByCode(code: string): Promise<Invitation | null> {
  const normalized = code.trim().toUpperCase();
  const snap = await getDoc(invitationDocument(normalized));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Invitation, 'id'>) };
}

export function useAcceptInvitation() {
  const [isAccepting, setIsAccepting] = useState(false);

  const accept = useCallback(
    async (
      invitation: Invitation,
      currentUser: { id: string; name?: string | null; email?: string | null; role?: string | null }
    ) => {
      if (!currentUser.id) {
        throw new Error('You must be signed in to accept an invitation.');
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new Error(`This invitation is no longer active (${invitation.status}).`);
      }

      if (new Date(invitation.expiresAt).getTime() < Date.now()) {
        throw new Error('This invitation has expired.');
      }

      if (
        invitation.email &&
        currentUser.email &&
        invitation.email.toLowerCase() !== currentUser.email.toLowerCase()
      ) {
        throw new Error(`This invitation was sent specifically to ${invitation.email}.`);
      }

      setIsAccepting(true);
      try {
        const firestore = getPlannerFirestore();
        const now = nowIso();
        const ops: BatchOperation[] = [];

        if (invitation.type === InvitationType.CONGREGATION && invitation.congregationId) {
          const memberId = `${invitation.congregationId}_${currentUser.id}`;
          const memberRef = doc(
            firestore,
            FIRESTORE_COLLECTIONS.congregationMembers,
            memberId
          );

          ops.push((b) =>
            b.set(
              memberRef,
              {
                id: memberId,
                userId: currentUser.id,
                congregationId: invitation.congregationId,
                congregationRole: invitation.congregationRole || 'publisher',
                groupId: invitation.groupId || null,
                status: 'active',
                joinedAt: now,
                approvedBy: invitation.invitedBy,
                approvedByName: invitation.invitedByName,
                approvedAt: now,
                user: {
                  id: currentUser.id,
                  name: currentUser.name || 'Publisher',
                  email: currentUser.email || '',
                  role: currentUser.role || 'USER',
                },
                updatedAt: now,
              },
              { merge: true }
            )
          );

          const userRef = doc(firestore, FIRESTORE_COLLECTIONS.users, currentUser.id);
          ops.push((b) =>
            b.update(userRef, {
              congregationId: invitation.congregationId,
              groupId: invitation.groupId || null,
              updatedAt: now,
            })
          );

          if (invitation.groupId && invitation.groupRole) {
            const groupRef = doc(firestore, FIRESTORE_COLLECTIONS.groups, invitation.groupId);
            if (invitation.groupRole === 'group_overseer') {
              ops.push((b) =>
                b.update(groupRef, {
                  overseerId: currentUser.id,
                  overseerName: currentUser.name || 'Group Overseer',
                  updatedAt: now,
                })
              );
            } else if (invitation.groupRole === 'assistant_overseer') {
              ops.push((b) =>
                b.update(groupRef, {
                  assistantOverseerId: currentUser.id,
                  assistantOverseerName: currentUser.name || 'Assistant Overseer',
                  updatedAt: now,
                })
              );
            }
          }

          if (invitation.invitedBy) {
            const notifRef = doc(collection(firestore, FIRESTORE_COLLECTIONS.notifications));
            ops.push((b) =>
              b.set(notifRef, {
                id: notifRef.id,
                userId: invitation.invitedBy,
                type: NotificationType.INVITATION_ACCEPTED,
                title: 'Invitation Accepted',
                body: `${currentUser.name || currentUser.email} has accepted your invitation to join ${invitation.congregationName || 'the congregation'} as ${invitation.congregationRole || 'publisher'}.`,
                data: JSON.stringify({
                  congregationId: invitation.congregationId,
                  acceptedUserId: currentUser.id,
                  invitationId: invitation.id,
                }),
                isRead: false,
                createdAt: now,
              })
            );
          }
        } else if (invitation.type === InvitationType.SYSTEM_ADMIN && invitation.systemRole) {
          const userRef = doc(firestore, FIRESTORE_COLLECTIONS.users, currentUser.id);
          ops.push((b) =>
            b.update(userRef, {
              role: invitation.systemRole,
              updatedAt: now,
            })
          );
        }

        const inviteRef = invitationDocument(invitation.id);
        ops.push((b) =>
          b.update(inviteRef, {
            status: InvitationStatus.ACCEPTED,
            acceptedAt: now,
            acceptedByUserId: currentUser.id,
            acceptedByUserName: currentUser.name || currentUser.email || null,
            updatedAt: now,
          })
        );

        await commitChunkedBatch(firestore, ops);
      } finally {
        setIsAccepting(false);
      }
    },
    []
  );

  return { accept, isAccepting };
}
