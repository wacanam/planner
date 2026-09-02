import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthSession as useSession } from '@/lib/firebase/auth';
import { getPlannerFirestore } from '@/lib/firebase/client';
import {
  createClientId,
  FIRESTORE_COLLECTIONS,
  nowIso,
} from '@/lib/firebase/schema';
import {
  getServiceYear,
  getServiceYearCountdown,
  getServiceYearRange,
} from '@/lib/service-year';
import type {
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementScope,
  ServiceYearSuggestion,
} from '@/types/api';

export interface CreateAnnouncementInput {
  scope: AnnouncementScope;
  congregationId?: string | null;
  congregationName?: string | null;
  serviceGroupId?: string | null;
  serviceGroupName?: string | null;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  isPinned?: boolean;
  expiresAt?: string | null;
  serviceYear?: number | null;
  actionUrl?: string | null;
}

export function useAnnouncements(congregationId?: string | null) {
  const { data: session } = useSession();
  const user = session?.user;
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setAllAnnouncements([]);
      setIsLoading(false);
      return;
    }

    const firestore = getPlannerFirestore();
    const annRef = collection(firestore, FIRESTORE_COLLECTIONS.announcements);

    const unsubscribe = onSnapshot(
      annRef,
      (snapshot) => {
        const list: Announcement[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            scope: (data.scope as AnnouncementScope) || 'congregation',
            congregationId: data.congregationId || null,
            congregationName: data.congregationName || null,
            serviceGroupId: data.serviceGroupId || null,
            serviceGroupName: data.serviceGroupName || null,
            title: data.title || 'Untitled Announcement',
            content: data.content || '',
            category: (data.category as AnnouncementCategory) || 'general',
            priority: (data.priority as AnnouncementPriority) || 'normal',
            isPinned: Boolean(data.isPinned),
            authorId: data.authorId || '',
            authorName: data.authorName || 'Overseer',
            authorRole: data.authorRole || 'ADMIN',
            createdAt: data.createdAt || nowIso(),
            updatedAt: data.updatedAt || nowIso(),
            expiresAt: data.expiresAt || null,
            serviceYear: data.serviceYear ? Number(data.serviceYear) : null,
            actionUrl: data.actionUrl || null,
          };
        });

        setAllAnnouncements(list);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.warn('[useAnnouncements web onSnapshot error]', err);
        setError(err.message);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.id]);

  const announcements = useMemo(() => {
    const isGlobalAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

    const filtered = allAnnouncements.filter((item) => {
      if (item.scope === 'system') return true;

      // Match congregation
      const matchCongregation =
        Boolean(congregationId && item.congregationId === congregationId) ||
        isGlobalAdmin ||
        Boolean(user?.congregationId && item.congregationId === user.congregationId);

      if (!matchCongregation) return false;

      // If congregation scope -> visible to whole congregation
      if (item.scope === 'congregation') return true;

      // If service_group scope
      if (item.scope === 'service_group') {
        if (isGlobalAdmin) return true;
        const cRole = (user as any)?.congregationRole || user?.role;
        const isOverseer =
          cRole === 'SERVICE_OVERSEER' ||
          cRole === 'service_overseer' ||
          cRole === 'SECRETARY' ||
          cRole === 'secretary';
        if (isOverseer) return true;

        // Check if user is in that group
        const uGroupId = (user as any)?.groupId || (user as any)?.serviceGroupId;
        if (uGroupId && item.serviceGroupId && uGroupId === item.serviceGroupId) {
          return true;
        }

        // Author can always see their own
        if (item.authorId === user?.id) return true;

        return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }

      const priorityWeight: Record<AnnouncementPriority, number> = {
        urgent: 3,
        important: 2,
        normal: 1,
      };
      const pDiff = (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
      if (pDiff !== 0) return pDiff;

      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [allAnnouncements, congregationId, user]);

  const congregationAnnouncements = useMemo(() => {
    return announcements.filter((a) => a.scope === 'congregation');
  }, [announcements]);

  const serviceGroupAnnouncements = useMemo(() => {
    return announcements.filter((a) => a.scope === 'service_group');
  }, [announcements]);

  const systemAnnouncements = useMemo(() => {
    return announcements.filter((a) => a.scope === 'system');
  }, [announcements]);

  const pinnedAnnouncements = useMemo(() => {
    return announcements.filter((a) => a.isPinned);
  }, [announcements]);

  const urgentAnnouncements = useMemo(() => {
    return announcements.filter((a) => a.priority === 'urgent');
  }, [announcements]);

  const createAnnouncement = useCallback(
    async (input: CreateAnnouncementInput): Promise<Announcement> => {
      if (!user?.id) throw new Error('You must be signed in to post an announcement.');

      const firestore = getPlannerFirestore();
      const id = createClientId();
      const timestamp = nowIso();

      const newAnnouncement: Announcement = {
        id,
        scope: input.scope,
        congregationId:
          input.scope === 'system'
            ? null
            : input.congregationId || congregationId || (user as any).congregationId || null,
        congregationName: input.congregationName || null,
        serviceGroupId: input.scope === 'service_group' ? input.serviceGroupId || null : null,
        serviceGroupName: input.scope === 'service_group' ? input.serviceGroupName || null : null,
        title: input.title.trim(),
        content: input.content.trim(),
        category: input.category,
        priority: input.priority,
        isPinned: Boolean(input.isPinned),
        authorId: user.id,
        authorName: user.name || user.email || 'Overseer',
        authorRole: (user as any).congregationRole || user.role || 'SERVICE_OVERSEER',
        createdAt: timestamp,
        updatedAt: timestamp,
        expiresAt: input.expiresAt || null,
        serviceYear: input.serviceYear ?? (input.category === 'service_year' ? getServiceYear() : null),
        actionUrl: input.actionUrl?.trim() || null,
      };

      await setDoc(doc(firestore, FIRESTORE_COLLECTIONS.announcements, id), newAnnouncement);
      return newAnnouncement;
    },
    [user, congregationId]
  );

  const updateAnnouncement = useCallback(
    async (
      id: string,
      patch: Partial<Omit<Announcement, 'id' | 'createdAt' | 'authorId'>>
    ): Promise<void> => {
      const firestore = getPlannerFirestore();
      await updateDoc(doc(firestore, FIRESTORE_COLLECTIONS.announcements, id), {
        ...patch,
        updatedAt: nowIso(),
      });
    },
    []
  );

  const deleteAnnouncement = useCallback(async (id: string): Promise<void> => {
    const firestore = getPlannerFirestore();
    await deleteDoc(doc(firestore, FIRESTORE_COLLECTIONS.announcements, id));
  }, []);

  const togglePin = useCallback(
    async (id: string, currentPin: boolean): Promise<void> => {
      await updateAnnouncement(id, { isPinned: !currentPin });
    },
    [updateAnnouncement]
  );

  return {
    announcements,
    congregationAnnouncements,
    serviceGroupAnnouncements,
    systemAnnouncements,
    pinnedAnnouncements,
    urgentAnnouncements,
    allAnnouncements,
    isLoading,
    error,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    togglePin,
  };
}

/**
 * Generates intelligent, periodic Service Year suggestions for Service Overseers & Secretaries.
 */
export function useServiceYearAnnouncementSuggestions(
  congregationId?: string | null,
  existingAnnouncements: Announcement[] = []
) {
  const currentSY = getServiceYear();
  const range = useMemo(() => getServiceYearRange(currentSY), [currentSY]);
  const countdown = useMemo(() => getServiceYearCountdown(new Date(), currentSY), [currentSY]);

  const suggestions: ServiceYearSuggestion[] = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();

    const list: ServiceYearSuggestion[] = [];

    const hasRecentAnnouncement = (keyword: string, withinDays = 45) => {
      const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000;
      return existingAnnouncements.some((a) => {
        const aDate = new Date(a.createdAt).getTime();
        const matchesKeyword =
          a.title.toLowerCase().includes(keyword.toLowerCase()) ||
          a.content.toLowerCase().includes(keyword.toLowerCase());
        return aDate >= cutoff && matchesKeyword;
      });
    };

    // 1. New Service Year Kickoff (Aug 15 - Oct 15)
    const isKickoffWindow =
      (month === 7 && day >= 15) || month === 8 || (month === 9 && day <= 15);

    if (isKickoffWindow && !hasRecentAnnouncement('kickoff', 30)) {
      list.push({
        id: `sy-kickoff-${currentSY}`,
        milestone: 'kickoff',
        serviceYear: currentSY,
        title: 'New Service Year Kickoff',
        badgeLabel: 'New Service Year',
        suggestedCategory: 'service_year',
        suggestedPriority: 'important',
        suggestedTitle: `Welcome to the ${range.label}!`,
        suggestedContent: `Dear brothers and sisters, as we begin the ${range.label}, we look forward to working together closely in our territory.\n\n• Please review your active territory assignments.\n• Regular service group meetings are scheduled.\n• If you are interested in auxiliary pioneering or taking on additional territories, please speak with the Service Overseer.\n\nMay Jehovah richly bless our collective ministry in the year ahead!`,
        reason: `September marks the start of the ${range.shortLabel}. Post an announcement to welcome publishers and set territory goals.`,
      });
    }

    // 2. Mid-Year Progress & Pacing (Jan 1 - Feb 28)
    const isMidYearWindow = month === 0 || month === 1;
    if (isMidYearWindow && !hasRecentAnnouncement('mid-year', 40)) {
      list.push({
        id: `sy-midyear-${currentSY}`,
        milestone: 'mid_year',
        serviceYear: currentSY,
        title: 'Mid-Year Territory Coverage Pacing',
        badgeLabel: 'Mid-Year Review',
        suggestedCategory: 'service_year',
        suggestedPriority: 'normal',
        suggestedTitle: `Mid-Year Field Ministry & Coverage Update (${range.shortLabel})`,
        suggestedContent: `We have reached the halfway mark of the ${range.shortLabel}! Thank you for your devoted efforts in covering the congregation territory.\n\nLet's continue to give special attention to unworked streets, not-at-homes, and cultivating return visits. If your assignment is completed, kindly return it so others can assist.`,
        reason: `Mid-year milestone reached. Encourage steady territory pacing and returning worked territories.`,
      });
    }

    // 3. Special Spring Campaign (March 1 - April 30)
    const isCampaignWindow = month === 2 || month === 3;
    if (isCampaignWindow && !hasRecentAnnouncement('campaign', 35)) {
      list.push({
        id: `sy-campaign-${currentSY}`,
        milestone: 'campaign',
        serviceYear: currentSY,
        title: 'Special Preaching Campaign & Memorial Season',
        badgeLabel: 'Campaign Drive',
        suggestedCategory: 'campaign',
        suggestedPriority: 'important',
        suggestedTitle: `Special Field Ministry Campaign (${range.shortLabel})`,
        suggestedContent: `During this special campaign season, our congregation will expand territory coverage with extra group witnessing arrangements.\n\n• Campaign territory maps are available upon request.\n• Publishers desiring to auxiliary pioneer are encouraged to submit their applications.\n\nLet us make every effort to reach every household in our territory!`,
        reason: `Spring campaign season. Encourage auxiliary pioneering, special campaign distributions, and group witnessing.`,
      });
    }

    // 4. Year-End Closing Push (July 15 - August 31)
    const isClosingWindow = (month === 6 && day >= 15) || month === 7;
    if (isClosingWindow && !hasRecentAnnouncement('closing', 25)) {
      list.push({
        id: `sy-closing-${currentSY}`,
        milestone: 'closing',
        serviceYear: currentSY,
        title: 'Service Year Concluding Wrap-Up',
        badgeLabel: 'Year-End Closing',
        suggestedCategory: 'service_year',
        suggestedPriority: 'urgent',
        suggestedTitle: `Concluding the ${range.label} — Territory Wrap-Up`,
        suggestedContent: `As the ${range.label} concludes on August 31, please assist the service committee by:\n\n1. Returning completed territory assignments.\n2. Updating all household visit logs, return visits, and do-not-call notations.\n3. Helping to work remaining unworked territories.\n\nThank you for your warm cooperation as we prepare the congregation S-13 registers!`,
        reason: `Only ${countdown.daysRemainingFormatted} left in the ${range.shortLabel}. Remind publishers to wrap up territories before August 31.`,
      });
    }

    if (list.length === 0) {
      list.push({
        id: `sy-pacing-${currentSY}`,
        milestone: 'mid_year',
        serviceYear: currentSY,
        title: `${range.shortLabel} Territory Activity`,
        badgeLabel: 'Territory Activity',
        suggestedCategory: 'service_year',
        suggestedPriority: 'normal',
        suggestedTitle: `Territory Coverage & Ministry Notice (${range.shortLabel})`,
        suggestedContent: `Dear brothers and sisters, we appreciate your diligent labor in covering our assigned territory.\n\nPlease remember to keep your visit records and return visits up to date in the app. If you need assistance with any territory, feel free to reach out to the service committee.`,
        reason: `Keep publishers engaged with territory coverage progress throughout the ${range.shortLabel}.`,
      });
    }

    return list;
  }, [currentSY, range, countdown, existingAnnouncements]);

  return {
    currentSY,
    serviceYearRange: range,
    countdown,
    suggestions,
    primarySuggestion: suggestions[0] || null,
  };
}
