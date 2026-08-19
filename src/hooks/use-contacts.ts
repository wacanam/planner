import { useEffect, useMemo, useState } from 'react';
import {
  createContact,
  deleteContact,
  subscribeContactsByHousehold,
  toContactView,
  updateContact,
  watchEncounters,
  watchHouseholds,
} from '@/lib/local-first';
import type { LocalContact, LocalEncounter, LocalHousehold } from '@/lib/local-first/types';
import type { Contact, CreateContactInput, UpdateContactInput } from '@/types/api';

export function useHouseholdContacts(householdId?: string | null) {
  const [rawContacts, setRawContacts] = useState<LocalContact[]>([]);
  const [household, setHousehold] = useState<LocalHousehold | null>(null);
  const [encounters, setEncounters] = useState<LocalEncounter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!householdId) {
      setRawContacts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribeContacts = subscribeContactsByHousehold(householdId, (records) => {
      setRawContacts(records);
      setIsLoading(false);
    });

    const unsubscribeHouseholds = watchHouseholds(
      undefined,
      (households) => {
        setHousehold(households.find((h) => h.id === householdId) ?? null);
      },
      (err) => setError(err.message)
    );

    const unsubscribeEncounters = watchEncounters(
      { householdId },
      (records) => {
        setEncounters(records);
      },
      (err) => setError(err.message)
    );

    return () => {
      unsubscribeContacts();
      unsubscribeHouseholds();
      unsubscribeEncounters();
    };
  }, [householdId]);

  const contacts: Contact[] = useMemo(() => {
    const encountersByContactName = new Map<string, LocalEncounter[]>();
    for (const e of encounters) {
      const name = (e.name || '').trim().toLowerCase();
      if (!name) continue;
      const list = encountersByContactName.get(name) || [];
      list.push(e);
      encountersByContactName.set(name, list);
    }

    return rawContacts.map((c) => {
      const nameKey = c.name.trim().toLowerCase();
      const contactEncounters = encountersByContactName.get(nameKey) || [];
      const count = contactEncounters.length;
      const latestEncounter = contactEncounters[0];

      return toContactView(
        c,
        household,
        count,
        latestEncounter?.encounterDate || null,
        latestEncounter?.response || null
      );
    });
  }, [rawContacts, household, encounters]);

  return {
    contacts,
    isLoading,
    error,
  };
}

export function useCreateContact() {
  const [isPending, setIsPending] = useState(false);

  const create = async (input: CreateContactInput): Promise<Contact> => {
    setIsPending(true);
    try {
      const created = await createContact(input);
      return toContactView(created);
    } finally {
      setIsPending(false);
    }
  };

  return { create, isPending };
}

export function useUpdateContact() {
  const [isPending, setIsPending] = useState(false);

  const update = async (id: string, input: UpdateContactInput): Promise<void> => {
    setIsPending(true);
    try {
      await updateContact(id, input);
    } finally {
      setIsPending(false);
    }
  };

  return { update, isPending };
}

export function useDeleteContact() {
  const [isPending, setIsPending] = useState(false);

  const remove = async (id: string): Promise<void> => {
    setIsPending(true);
    try {
      await deleteContact(id);
    } finally {
      setIsPending(false);
    }
  };

  return { remove, isPending };
}
