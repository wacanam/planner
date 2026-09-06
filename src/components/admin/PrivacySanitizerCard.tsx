// src/components/admin/PrivacySanitizerCard.tsx
'use client';

import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrentUser } from '@/hooks';
import { getPlannerAuth } from '@/lib/firebase/client';
import type { SanitizerReport } from '@/lib/privacy/privacy-sanitizer';
import type { Congregation } from '@/types/api';

interface PrivacySanitizerCardProps {
  congregations: Congregation[];
}

export function PrivacySanitizerCard({ congregations }: PrivacySanitizerCardProps) {
  const { user } = useCurrentUser();
  const isSuperAdmin =
    String(user.role || '').toUpperCase() === 'SUPER_ADMIN' ||
    String(user.role || '').toLowerCase() === 'super_admin';

  const defaultCongregation = isSuperAdmin ? 'all' : user.congregationId || 'all';
  const [selectedCongregationId, setSelectedCongregationId] = useState<string>(defaultCongregation);
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<SanitizerReport | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showSamples, setShowSamples] = useState(false);

  const runSanitization = async (mode: 'dry_run' | 'execute') => {
    setIsRunning(true);
    try {
      const auth = getPlannerAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Admin authentication token is missing.');
      }

      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/admin/sanitize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          mode,
          congregationId: selectedCongregationId === 'all' ? null : selectedCongregationId,
          targets: ['households', 'visits', 'legacy'],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete sanitization process.');
      }

      setReport(data.report);
      if (mode === 'execute') {
        toast.success(
          `Sanitization complete! Cleaned ${data.report.householdsSanitized} households and ${data.report.visitsSanitized} visits.`
        );
      } else {
        toast.info(
          `Audit complete: Found ${data.report.householdsSanitized} households and ${data.report.visitsSanitized} visits needing sanitization.`
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'Error running privacy sanitizer.');
    } finally {
      setIsRunning(false);
      setConfirmOpen(false);
    }
  };

  const selectedCongName =
    selectedCongregationId === 'all'
      ? 'All Congregations'
      : congregations.find((c) => c.id === selectedCongregationId)?.name || 'Selected Congregation';

  return (
    <Card className="bg-card border-border shadow-xs overflow-hidden">
      <CardHeader className="pb-4 space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <CardTitle className="text-base font-bold">
              Data Privacy & S-13 Territory Sanitizer
            </CardTitle>
            <Badge
              variant="outline"
              className="text-[10px] uppercase tracking-wider py-0.5 px-2 border-primary/30 text-primary font-bold"
            >
              Governance
            </Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
            Audits and cleans publisher-entered data in Firestore to ensure full alignment with
            Branch S-13 guidelines and privacy regulations. Strips family names from addresses,
            redacts phone numbers from notes, and prunes shared spiritual/demographic fields.
          </CardDescription>
        </div>

        {/* Responsive Controls Bar */}
        <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {isSuperAdmin && (
            <div className="w-full sm:w-auto shrink-0">
              <Select
                value={selectedCongregationId}
                onValueChange={(val) => setSelectedCongregationId(val)}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs w-full sm:w-[210px] bg-background">
                  <SelectValue placeholder="Target workspace" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">🌐 All Congregations</SelectItem>
                  {congregations.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto sm:ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => runSanitization('dry_run')}
              disabled={isRunning}
              className="h-auto min-h-[38px] py-2 px-3.5 rounded-xl text-xs font-semibold gap-2 border-border w-full sm:w-auto whitespace-normal text-center leading-snug justify-center"
            >
              {isRunning ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
              ) : (
                <Eye className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
              <span className="break-words">Audit &amp; Preview</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={isRunning}
              className="h-auto min-h-[38px] py-2 px-3.5 rounded-xl text-xs font-semibold gap-2 shadow-2xs w-full sm:w-auto whitespace-normal text-center leading-snug justify-center"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="break-words">Sanitize Records</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Results Panel */}
      {report && (
        <CardContent className="pt-0 space-y-4">
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-2">
                <Badge
                  variant={report.mode === 'execute' ? 'default' : 'outline'}
                  className="capitalize font-bold text-[10px]"
                >
                  {report.mode === 'execute' ? '✓ Changes Applied' : '🔍 Audit Preview'}
                </Badge>
                <span className="text-muted-foreground font-medium">
                  Workspace: <strong className="text-foreground">{selectedCongName}</strong>
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Run at {new Date(report.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-background border border-border/60">
                <div className="text-[11px] text-muted-foreground">Households Analyzed</div>
                <div className="text-base font-extrabold text-foreground mt-0.5">
                  {report.householdsScanned}
                </div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  {report.householdsSanitized} {report.mode === 'execute' ? 'sanitized' : 'flagged'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-background border border-border/60">
                <div className="text-[11px] text-muted-foreground">Visits Analyzed</div>
                <div className="text-base font-extrabold text-foreground mt-0.5">
                  {report.visitsScanned}
                </div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  {report.visitsSanitized} {report.mode === 'execute' ? 'sanitized' : 'flagged'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-background border border-border/60">
                <div className="text-[11px] text-muted-foreground">Legacy Contacts</div>
                <div className="text-base font-extrabold text-foreground mt-0.5">
                  {report.contactsDeleted}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {report.mode === 'execute' ? 'pruned' : 'to prune'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-background border border-border/60">
                <div className="text-[11px] text-muted-foreground">Member Locations</div>
                <div className="text-base font-extrabold text-foreground mt-0.5">
                  {report.memberLocationsDeleted}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {report.mode === 'execute' ? 'pruned' : 'to prune'}
                </div>
              </div>
            </div>

            {report.sampleChanges.length > 0 && (
              <div className="pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowSamples(!showSamples)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  <span>Sample Changes ({report.sampleChanges.length} records)</span>
                  {showSamples ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showSamples && (
                  <div className="mt-2.5 space-y-2 max-h-60 overflow-y-auto pr-1">
                    {report.sampleChanges.map((sample, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-background/80 border border-border/50 text-[11px] space-y-1"
                      >
                        <div className="flex items-center gap-1.5 font-bold text-foreground flex-wrap">
                          <Badge
                            variant="outline"
                            className="text-[9px] uppercase px-1 py-0 shrink-0"
                          >
                            {sample.collection}
                          </Badge>
                          <span className="text-muted-foreground text-[10px] font-mono break-all">
                            ID: {sample.id}
                          </span>
                        </div>
                        <ul className="pl-4 list-disc space-y-0.5 text-muted-foreground">
                          {sample.summary.map((item, itemIdx) => (
                            <li key={itemIdx} className="break-words">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      )}

      {/* Confirmation Dialog */}
      <ResponsiveDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Execute Database Sanitization"
        description="Permanently alter and sanitize publisher-entered records in Firestore"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Permanent Database Cleansing</span>
            </div>
            <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
              This action will permanently alter records for{' '}
              <strong className="underline">{selectedCongName}</strong>:
            </p>
            <ul className="pl-5 list-disc space-y-1 text-amber-800 dark:text-amber-300">
              <li>
                Strips family names (e.g. &ldquo;Santos Residence&rdquo;) from address fields.
              </li>
              <li>Prunes deprecated fields (occupantsCount, resident name, letter notes).</li>
              <li>Redacts phone numbers and email addresses in access notes.</li>
              <li>Clears spiritual topics and literature placements from shared visit logs.</li>
              <li>Prunes any legacy contacts or member live locations.</li>
            </ul>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-auto min-h-[38px] py-2 px-4 rounded-xl text-xs w-full sm:w-auto whitespace-normal text-center leading-snug font-medium"
              onClick={() => setConfirmOpen(false)}
              disabled={isRunning}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-auto min-h-[38px] py-2 px-4 rounded-xl text-xs font-semibold gap-2 w-full sm:w-auto whitespace-normal text-center leading-snug"
              onClick={() => runSanitization('execute')}
              disabled={isRunning}
            >
              {isRunning ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
              ) : (
                <Play className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>{isRunning ? 'Sanitizing…' : 'Confirm & Execute'}</span>
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </Card>
  );
}
