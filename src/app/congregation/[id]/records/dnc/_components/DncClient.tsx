'use client';

import { AlertTriangle, CheckCircle2, MapPin, Plus, Search, ShieldAlert } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCongregationTerritories, useCurrentUser, useHouseholds } from '@/hooks';
import { canManageDoNotCallList } from '@/lib/permissions';
import { updateHouseholdRecord } from '@/lib/record-writes';
import type { Household } from '@/types/api';

export default function DncClient() {
  const params = useParams();
  const congregationId = (params?.id as string) || '';
  const { user } = useCurrentUser();
  const { households = [], isLoading } = useHouseholds({ congregationId });
  const { data: territories = [] } = useCongregationTerritories(congregationId);

  const [searchQuery, setSearchQuery] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const canManage = canManageDoNotCallList(user?.role, user?.congregationRole);

  const territoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of territories) {
      map.set(t.id, `#${t.number} - ${t.name}`);
    }
    return map;
  }, [territories]);

  // Filter households that are marked as 'do_not_call'
  const dncHouseholds = useMemo(() => {
    return households.filter((h) => h.status === 'do_not_call');
  }, [households]);

  const filteredHouseholds = useMemo(() => {
    let result = [...dncHouseholds];

    if (territoryFilter !== 'all') {
      result = result.filter((h) => h.territoryId === territoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (h) =>
          h.address.toLowerCase().includes(q) ||
          h.streetName?.toLowerCase().includes(q) ||
          h.houseNumber?.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => a.address.localeCompare(b.address));
  }, [dncHouseholds, territoryFilter, searchQuery]);

  const handleRemoveDnc = async (household: Household) => {
    if (!canManage) {
      toast.error('Only congregation overseers or territory servants can remove DNC status.');
      return;
    }
    if (
      !confirm(
        `Are you sure you want to remove the Do Not Call status for "${household.address}"? This household will return to regular field service.`
      )
    ) {
      return;
    }

    try {
      await updateHouseholdRecord(household.id, {
        status: 'new',
      });
      toast.success(`Removed DNC status from ${household.address}`);
    } catch (err: any) {
      toast.error(`Failed to update status: ${err.message}`);
    }
  };

  const handleMarkDnc = async () => {
    if (!selectedHouseholdId) {
      toast.error('Please select an address to mark as Do Not Call.');
      return;
    }

    setSaving(true);
    try {
      await updateHouseholdRecord(selectedHouseholdId, {
        status: 'do_not_call',
      });
      toast.success('Address marked as Do Not Call');
      setDialogOpen(false);
      setSelectedHouseholdId('');
    } catch (err: any) {
      toast.error(`Failed to update: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Households not currently DNC
  const nonDncHouseholds = useMemo(() => {
    return households.filter((h) => h.status !== 'do_not_call');
  }, [households]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 min-w-0 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6 text-destructive shrink-0" />
              <span className="whitespace-nowrap">Do Not Call (DNC) Registry</span>
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] sm:text-[11px] gap-1 border-destructive/40 text-destructive bg-destructive/10 font-medium shrink-0 whitespace-nowrap"
            >
              {dncHouseholds.length} Registered Household{dncHouseholds.length === 1 ? '' : 's'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Mandatory skip list. Field service groups must never knock on or contact these
            addresses.
          </p>
        </div>

        {canManage && (
          <Button
            onClick={() => setDialogOpen(true)}
            size="sm"
            variant="destructive"
            className="h-9 gap-1.5 text-xs shadow-xs w-full sm:w-auto justify-center shrink-0"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Register DNC Address</span>
          </Button>
        )}
      </div>

      {/* Warning Notice Banner */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-destructive/10 text-destructive shrink-0">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="text-xs space-y-1">
          <p className="font-semibold text-foreground">Strict Legal & Congregational Compliance</p>
          <p className="text-muted-foreground leading-relaxed">
            When a householder requests not to be visited, the address must be recorded here and
            respected by all publishers. In compliance with data privacy regulations, this registry
            contains <strong className="text-foreground">only physical addresses</strong>—never
            personal names or resident descriptions.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search DNC list by street or house number..."
            className="pl-9 h-10 rounded-xl text-xs sm:text-sm bg-background border-border shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
            <SelectTrigger className="h-10 w-48 rounded-xl text-xs">
              <SelectValue placeholder="All Territories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Territories</SelectItem>
              {territories.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  #{t.number} - {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* DNC List */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-muted-foreground">
          Loading Do Not Call records...
        </div>
      ) : filteredHouseholds.length === 0 ? (
        <div className="py-16 text-center space-y-3 rounded-2xl border border-dashed border-border bg-muted/20 p-8">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-foreground">
              {searchQuery || territoryFilter !== 'all'
                ? 'No matching DNC addresses found'
                : 'No Do Not Call records'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {searchQuery || territoryFilter !== 'all'
                ? 'Try adjusting your search or territory filter.'
                : 'There are currently no households marked as Do Not Call in this congregation.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredHouseholds.map((h) => (
            <Card
              key={h.id}
              className="rounded-2xl border border-destructive/20 bg-destructive/5/30 shadow-2xs"
            >
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{h.address}</span>
                      <Badge variant="destructive" className="text-[10px] px-2 py-0">
                        DO NOT CALL
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0 text-destructive/70" />
                      <span>
                        {h.territoryId && territoryMap.has(h.territoryId)
                          ? `Territory ${territoryMap.get(h.territoryId)}`
                          : 'Unassigned territory'}
                      </span>
                    </p>
                  </div>

                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveDnc(h)}
                      className="h-7 text-[11px] border-border hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                    >
                      Clear DNC
                    </Button>
                  )}
                </div>

                {h.notes && (
                  <div className="p-2 rounded-lg bg-background/80 border border-border/60 text-muted-foreground text-[11px]">
                    <strong className="text-foreground">Access note: </strong>
                    {h.notes}
                  </div>
                )}

                <div className="text-[10px] text-muted-foreground pt-1 border-t border-destructive/10 flex items-center justify-between">
                  <span>
                    Last verified: {new Date(h.updatedAt || h.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-destructive font-medium">Skip this household</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add DNC Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-4 w-4" />
              Register Do Not Call (DNC) Address
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select an address from the congregation directory to mark as Do Not Call. Field
              service groups will be instructed to skip this household.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select Household / Address *</Label>
              <Select value={selectedHouseholdId} onValueChange={setSelectedHouseholdId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose an address..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {nonDncHouseholds.map((h) => (
                    <SelectItem key={h.id} value={h.id} className="text-xs">
                      {h.address}{' '}
                      {h.territoryId && territoryMap.has(h.territoryId)
                        ? `(Territory #${territories.find((t) => t.id === h.territoryId)?.number})`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleMarkDnc}
              disabled={!selectedHouseholdId || saving}
              className="text-xs"
            >
              {saving ? 'Registering...' : 'Confirm Do Not Call'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
