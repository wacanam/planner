// src/components/privacy/ExportPersonalNotesBanner.tsx
'use client';

import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import {
  CheckCircle2,
  Download,
  FileJson,
  FileSpreadsheet,
  HardDriveDownload,
  Loader2,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrentUser } from '@/hooks';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/schema';
import {
  exportPersonalCallsAsCsv,
  exportPersonalCallsAsJson,
  importPersonalCallsFromCloud,
} from '@/lib/local-first/personal-calls';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'kanataran_privacy_banner_dismissed_v1';

export interface ExportPersonalNotesBannerProps {
  className?: string;
}

export function ExportPersonalNotesBanner({ className }: ExportPersonalNotesBannerProps = {}) {
  const { user } = useCurrentUser();
  const [isDismissed, setIsDismissed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [transferredCount, setTransferredCount] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (!dismissed) {
        setIsDismissed(false);
      }
    }
  }, []);

  if (isDismissed || !user) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISS_KEY, 'true');
    }
  };

  const handleTransferToDevice = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const db = getPlannerFirestore();

      // 1. Fetch user's encounters from Firestore
      const encQuery = query(
        collection(db, FIRESTORE_COLLECTIONS.encounters),
        where('userId', '==', user.id)
      );
      const encSnap = await getDocs(encQuery);
      const encounters = encSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // 2. Fetch user's contacts from Firestore
      let contacts: any[] = [];
      try {
        const contactQuery = query(
          collection(db, FIRESTORE_COLLECTIONS.contacts),
          where('createdById', '==', user.id)
        );
        const contactSnap = await getDocs(contactQuery);
        contacts = contactSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (cErr) {
        console.warn('Contacts collection query skipped or empty:', cErr);
      }

      if (encounters.length === 0 && contacts.length === 0) {
        toast.info('No personal return visits found in the cloud to transfer.');
        setTransferredCount(0);
        return;
      }

      // 3. Fetch households associated with encounters/contacts to enrich territoryId
      const householdIds = Array.from(
        new Set(
          [
            ...encounters.map((e: any) => e.householdId),
            ...contacts.map((c: any) => c.householdId),
          ].filter((id): id is string => Boolean(id))
        )
      );

      const cloudHouseholds: any[] = [];
      await Promise.all(
        householdIds.map(async (hhId) => {
          try {
            const hSnap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.households, hhId));
            if (hSnap.exists()) {
              cloudHouseholds.push({ id: hSnap.id, ...hSnap.data() });
            }
          } catch {
            // Ignore individual fetch errors
          }
        })
      );

      // 4. Import directly into IndexedDB with full territoryId and address resolution
      const count = await importPersonalCallsFromCloud(
        user.id,
        encounters,
        contacts,
        cloudHouseholds
      );
      setTransferredCount(count);
      toast.success(
        `Safely saved ${count} personal return visit${count === 1 ? '' : 's'} to this device!`
      );
    } catch (err: any) {
      console.error('Transfer failed:', err);
      toast.error(`Failed to transfer records to device: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = async () => {
    if (!user) return;
    try {
      const csv = await exportPersonalCallsAsCsv(user.id);
      downloadFile(
        csv,
        `personal-ministry-notes-${new Date().toISOString().slice(0, 10)}.csv`,
        'text/csv'
      );
      toast.success('Downloaded notes as CSV');
    } catch {
      toast.error('Could not generate CSV export');
    }
  };

  const handleDownloadJson = async () => {
    if (!user) return;
    try {
      const json = await exportPersonalCallsAsJson(user.id);
      downloadFile(
        json,
        `personal-ministry-notes-${new Date().toISOString().slice(0, 10)}.json`,
        'application/json'
      );
      toast.success('Downloaded notes as JSON');
    } catch {
      toast.error('Could not generate JSON export');
    }
  };

  return (
    <Card
      className={cn(
        'rounded-3xl border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/15 p-4 sm:p-5 relative shadow-xs overflow-hidden w-full',
        className
      )}
    >
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-amber-500/10 transition-colors"
        title="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pr-6 sm:pr-8">
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h4 className="font-semibold text-sm text-foreground">
              Data Privacy & Personal Notes Protection
            </h4>
            <Badge
              variant="outline"
              className="text-[10px] uppercase tracking-wider py-0 px-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300"
            >
              1-Week Notice
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            In accordance with branch privacy guidelines, congregation territory records are
            transitioning to strict data minimization. Personal return visit notes and scriptures
            will now be stored <strong>securely on your local device only</strong> with zero cloud
            sharing.
          </p>
          {transferredCount !== null && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 pt-0.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {transferredCount} personal call{transferredCount === 1 ? '' : 's'} successfully
              preserved on this device.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
          <Button
            size="sm"
            onClick={handleTransferToDevice}
            disabled={loading}
            className="h-8.5 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 rounded-xl font-semibold shadow-2xs"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <HardDriveDownload className="h-3.5 w-3.5" />
            )}
            Transfer to My Device
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8.5 gap-1 border-amber-500/40 hover:bg-amber-500/10 text-amber-900 dark:text-amber-200 rounded-xl font-semibold"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem
                onClick={handleDownloadCsv}
                className="gap-2 cursor-pointer text-xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Download CSV Spreadsheet
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDownloadJson}
                className="gap-2 cursor-pointer text-xs"
              >
                <FileJson className="h-3.5 w-3.5" />
                Download JSON File
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
