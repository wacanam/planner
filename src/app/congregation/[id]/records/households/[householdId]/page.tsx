'use client';

import { ArrowLeft, Clock, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  getEncountersByHousehold,
  getHouseholdById,
  getVisitsByHousehold,
} from '@/lib/local-first';
import type { LocalEncounter, LocalHousehold, LocalVisit } from '@/lib/local-first/types';

export default function HouseholdDetailPage() {
  const params = useParams<{ id: string; householdId: string }>();
  const congregationId = params?.id;
  const householdId = params?.householdId;

  const [household, setHousehold] = useState<LocalHousehold | null>(null);
  const [visits, setVisits] = useState<LocalVisit[]>([]);
  const [encounters, setEncounters] = useState<LocalEncounter[]>([]);

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
    <main className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 sm:px-6 lg:px-8 py-8">
      <Button asChild variant="ghost" size="sm" className="w-fit text-xs gap-1 rounded-xl">
        <Link href={`/congregation/${congregationId}/records/households`}>
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Households</span>
        </Link>
      </Button>

      {!household ? (
        <div className="p-12 text-center bg-card rounded-3xl border border-border">
          <p className="text-sm text-muted-foreground">Household record not found.</p>
        </div>
      ) : (
        <>
          <Card className="bg-card border-border shadow-xs">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h1 className="text-xl font-bold text-foreground">{household.address}</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {household.streetName}, {household.city}
                    {household.creatorName ? ` · Owner: ${household.creatorName}` : ''}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize text-xs font-semibold">
                  {household.status}
                </Badge>
              </div>

              <div className="flex gap-2 flex-wrap text-xs pt-2">
                <Badge variant="outline">Occupants: {household.occupantsCount ?? 1}</Badge>
                <Badge variant="outline" className="capitalize">
                  {household.type}
                </Badge>
                {household.latitude && household.longitude ? (
                  <Badge variant="outline" className="text-primary font-bold">
                    📍 {Number(household.latitude).toFixed(5)},{' '}
                    {Number(household.longitude).toFixed(5)}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/40"
                  >
                    📍 Needs Pinning
                  </Badge>
                )}
              </div>

              {household.notes && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1">Notes / Instructions:</p>
                  <p>{household.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visits Timeline */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Clock size={16} className="text-primary" />
              <span>Visit Records ({visits.length})</span>
            </h2>
            {visits.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4 bg-card rounded-2xl border border-border text-center">
                No visits logged yet.
              </p>
            ) : (
              visits.map((visit) => (
                <div
                  key={visit.id}
                  className="p-4 rounded-2xl border border-border bg-card space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground capitalize">
                      {visit.outcome.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(visit.visitDate).toLocaleString()}
                    </p>
                  </div>
                  {visit.notes && <p className="text-xs text-muted-foreground">{visit.notes}</p>}
                </div>
              ))
            )}
          </div>

          {/* Encounters Timeline */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Users size={16} className="text-primary" />
              <span>Person Encounters ({encounters.length})</span>
            </h2>
            {encounters.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4 bg-card rounded-2xl border border-border text-center">
                No conversation encounters recorded yet.
              </p>
            ) : (
              encounters.map((encounter) => (
                <div
                  key={encounter.id}
                  className="p-4 rounded-2xl border border-border bg-card space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground">{encounter.name}</p>
                    <Badge variant="outline" className="text-[9px] capitalize font-semibold">
                      {encounter.response}
                    </Badge>
                  </div>
                  {encounter.topicDiscussed && (
                    <p className="text-xs text-muted-foreground">
                      Topic: {encounter.topicDiscussed}
                    </p>
                  )}
                  {encounter.notes && (
                    <p className="text-xs text-muted-foreground">{encounter.notes}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </main>
  );
}
