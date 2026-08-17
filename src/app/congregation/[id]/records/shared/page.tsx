'use client';

import { ArrowDownLeft, ArrowUpRight, Check, Share2, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRespondToShare, useShares } from '@/hooks/use-shares';

export default function SharedRecordsPage() {
  const params = useParams();
  const _congregationId = (params?.id as string) || '';

  const { shares = [], isLoading } = useShares();
  const { respond, isPending: responding } = useRespondToShare();

  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');

  const incoming = shares.filter((s) => s.direction === 'incoming');
  const outgoing = shares.filter((s) => s.direction === 'outgoing');

  const handleRespond = async (shareId: string, accept: boolean) => {
    await respond({
      shareId,
      status: accept ? 'accepted' : 'rejected',
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 min-w-0 w-full">
      <div>
        <h1 className="text-xl font-bold text-foreground">Shared & Transferred Records</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Collaborate with partner publishers or receive transferred return visits
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-muted/40 rounded-2xl w-fit border border-border">
        <button
          type="button"
          onClick={() => setActiveTab('incoming')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'incoming'
              ? 'bg-card text-primary shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ArrowDownLeft size={14} />
          <span>Incoming Requests ({incoming.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('outgoing')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'outgoing'
              ? 'bg-card text-primary shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ArrowUpRight size={14} />
          <span>Outgoing Shares ({outgoing.length})</span>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : activeTab === 'incoming' ? (
        incoming.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-border p-6">
            <Share2 size={36} className="text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No incoming shared records</p>
            <p className="text-xs text-muted-foreground mt-1">
              When a publisher shares a door record with you, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {incoming.map((share) => (
              <Card key={share.id} className="bg-card border-border shadow-xs">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-foreground">
                        {share.householdAddress || 'Household Record'}
                      </p>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {share.mode}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40"
                      >
                        {share.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      From: {share.fromUserName || 'Publisher'}
                    </p>
                    {share.notes && (
                      <p className="text-xs text-muted-foreground/90 italic mt-1">
                        &ldquo;{share.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {share.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs gap-1"
                        onClick={() => handleRespond(share.id, false)}
                        disabled={responding}
                      >
                        <X size={13} />
                        <span>Decline</span>
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-xl text-xs gap-1 font-semibold"
                        onClick={() => handleRespond(share.id, true)}
                        disabled={responding}
                      >
                        <Check size={13} />
                        <span>Accept Record</span>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : outgoing.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-3xl border border-border p-6">
          <Share2 size={36} className="text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground">No outgoing shared records</p>
          <p className="text-xs text-muted-foreground mt-1">
            You can share household records from the Household directory.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {outgoing.map((share) => (
            <Card key={share.id} className="bg-card border-border shadow-xs">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-foreground">
                      {share.householdAddress || 'Household Record'}
                    </p>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {share.mode}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                      {share.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sent to: {share.toUserName || 'Publisher'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
