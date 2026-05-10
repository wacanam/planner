'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getHouseholdById } from '@/lib/db/households';
import { getVisitsByHousehold } from '@/lib/db/visits';
import { getEncountersByHousehold } from '@/lib/db/encounters';
import type { EncounterRecord, HouseholdRecord, VisitRecord } from '@/lib/db/types';

export default function HouseholdDetailPage() {
  const params = useParams<{ id: string; householdId: string }>();
  const congregationId = params?.id;
  const householdId = params?.householdId;

  const [household, setHousehold] = useState<HouseholdRecord | null>(null);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [encounters, setEncounters] = useState<EncounterRecord[]>([]);

  useEffect(() => {
    if (!householdId) return;

    const load = async () => {
      const [householdResult, visitResult, encounterResult] = await Promise.all([
        getHouseholdById(householdId),
        getVisitsByHousehold(householdId),
        getEncountersByHousehold(householdId),
      ]);
      setHousehold(householdResult ?? null);
      setVisits(visitResult);
      setEncounters(encounterResult);
    };

    void load();
  }, [householdId]);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6">
      <Button asChild variant="ghost" className="w-fit">
        <Link href={`/congregation/${congregationId}/records/households`}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </Button>

      {!household ? (
        <p className="text-sm text-muted-foreground">Household not found in local IndexedDB.</p>
      ) : (
        <>
          <div className="rounded-xl border p-4">
            <h1 className="text-lg font-semibold">{household.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{household.address}</p>
            <div className="mt-3 flex gap-2">
              <Badge variant="outline">Members: {household.membersCount}</Badge>
              <Badge variant="outline">{household.latitude.toFixed(5)}, {household.longitude.toFixed(5)}</Badge>
            </div>
            {household.notes ? <p className="mt-3 text-sm">{household.notes}</p> : null}
          </div>

          <div className="rounded-xl border p-4 space-y-2">
            <h2 className="text-sm font-semibold">Visits ({visits.length})</h2>
            {visits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No local visit records yet.</p>
            ) : (
              visits.map((visit) => (
                <div key={visit.id} className="rounded-lg border p-3">
                  <p className="text-sm font-medium capitalize">{visit.outcome.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">{new Date(visit.visitDate).toLocaleString()}</p>
                  {visit.notes ? <p className="text-sm mt-1">{visit.notes}</p> : null}
                </div>
              ))
            )}
          </div>

          <div className="rounded-xl border p-4 space-y-2">
            <h2 className="text-sm font-semibold">Encounters ({encounters.length})</h2>
            {encounters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No local encounter records yet.</p>
            ) : (
              encounters.map((encounter) => (
                <div key={encounter.id} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{encounter.name}</p>
                  <p className="text-xs text-muted-foreground">{encounter.response}</p>
                  {encounter.notes ? <p className="text-sm mt-1">{encounter.notes}</p> : null}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </main>
  );
}
