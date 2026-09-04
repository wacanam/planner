// src/components/households/PersonalCallDialog.tsx
'use client';

import { BookOpen, Calendar, Clock, Lock, ShieldCheck, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import {
  deletePersonalCall,
  type PersonalCallRecord,
  savePersonalCall,
} from '@/lib/local-first/personal-calls';

export interface PersonalCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  householdId?: string | null;
  address?: string | null;
  houseNumber?: string | null;
  streetName?: string | null;
  territoryId?: string | null;
  initialCall?: PersonalCallRecord | null;
  onSaved?: () => void;
}

export function PersonalCallDialog({
  open,
  onOpenChange,
  userId,
  householdId,
  address,
  houseNumber,
  streetName,
  territoryId,
  initialCall,
  onSaved,
}: PersonalCallDialogProps) {
  const [personName, setPersonName] = useState(initialCall?.personName || '');
  const [customAddress, setCustomAddress] = useState(initialCall?.address || '');
  const [status, setStatus] = useState<PersonalCallRecord['status']>(initialCall?.status || 'note');
  const [phoneNumber, setPhoneNumber] = useState(initialCall?.phoneNumber || '');
  const [email, setEmail] = useState(initialCall?.email || '');
  const [language, setLanguage] = useState(initialCall?.language || '');
  const [scripturesDiscussed, setScripturesDiscussed] = useState(
    initialCall?.scripturesDiscussed || ''
  );
  const [literaturePlaced, setLiteraturePlaced] = useState(initialCall?.literaturePlaced || '');
  const [nextVisitDate, setNextVisitDate] = useState(initialCall?.nextVisitDate || '');
  const [nextVisitTime, setNextVisitTime] = useState(initialCall?.nextVisitTime || '');
  const [notes, setNotes] = useState(initialCall?.notes || '');
  const [saving, setSaving] = useState(false);

  // Sync when initialCall changes
  React.useEffect(() => {
    if (initialCall) {
      setPersonName(initialCall.personName || '');
      setCustomAddress(initialCall.address || '');
      setStatus(initialCall.status || 'note');
      setPhoneNumber(initialCall.phoneNumber || '');
      setEmail(initialCall.email || '');
      setLanguage(initialCall.language || '');
      setScripturesDiscussed(initialCall.scripturesDiscussed || '');
      setLiteraturePlaced(initialCall.literaturePlaced || '');
      setNextVisitDate(initialCall.nextVisitDate || '');
      setNextVisitTime(initialCall.nextVisitTime || '');
      setNotes(initialCall.notes || '');
    } else {
      setPersonName('');
      setCustomAddress('');
      setStatus('note');
      setPhoneNumber('');
      setEmail('');
      setLanguage('');
      setScripturesDiscussed('');
      setLiteraturePlaced('');
      setNextVisitDate('');
      setNextVisitTime('');
      setNotes('');
    }
  }, [initialCall]);

  const handleSave = async () => {
    if (!personName.trim() && !notes.trim()) {
      toast.error('Please enter a person/reference name or note details.');
      return;
    }

    setSaving(true);
    try {
      const finalAddress =
        address || customAddress.trim() || initialCall?.address || 'Personal Note';
      const finalHouseholdId = householdId || initialCall?.householdId || null;
      const callId =
        initialCall?.id ||
        (finalHouseholdId ? `personal-${finalHouseholdId}` : `personal-call-${Date.now()}`);

      const record: PersonalCallRecord = {
        id: callId,
        userId,
        householdId: finalHouseholdId,
        territoryId: territoryId || initialCall?.territoryId || null,
        address: finalAddress,
        houseNumber: houseNumber || initialCall?.houseNumber || null,
        streetName: streetName || initialCall?.streetName || null,
        personName: personName.trim() || (status === 'note' ? 'General Note' : 'Unnamed Contact'),
        phoneNumber: phoneNumber.trim() || null,
        email: email.trim() || null,
        language: language.trim() || null,
        status,
        scripturesDiscussed: scripturesDiscussed.trim() || null,
        literaturePlaced: literaturePlaced.trim() || null,
        nextVisitDate: nextVisitDate || null,
        nextVisitTime: nextVisitTime || null,
        nextVisitNotes: null,
        notes: notes.trim() || null,
        createdAt: initialCall?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await savePersonalCall(record);
      toast.success('Saved to your personal device notebook.');
      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      toast.error(`Failed to save note: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialCall?.id) return;
    if (!confirm('Remove this note from your personal notebook?')) return;

    setSaving(true);
    try {
      await deletePersonalCall(initialCall.id);
      toast.info('Removed from personal notebook.');
      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      toast.error(`Failed to remove: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:p-0 pb-0 sm:pb-0 gap-0 overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[85vh] sm:max-w-lg">
        {/* Fixed Header */}
        <DialogHeader className="shrink-0 px-5 sm:px-6 pt-5 pb-3.5 border-b border-border/50 bg-card text-left">
          <div className="pr-8 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 shrink-0 text-foreground">
                <BookOpen className="h-4.5 w-4.5 text-primary shrink-0" />
                <span className="whitespace-nowrap">
                  {initialCall ? 'Edit Note' : 'Add to Personal Notebook'}
                </span>
              </DialogTitle>
              <Badge
                variant="outline"
                className="text-[10px] sm:text-[11px] gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-medium shrink-0 whitespace-nowrap"
              >
                <Lock className="h-2.5 w-2.5 shrink-0" />
                <span>Private to You</span>
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {address || customAddress || 'Personal Note'} • Stored exclusively on this device
              (never shared with congregation cloud).
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Scrollable Body - ONLY body scrolls */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 sm:px-6 py-4 space-y-3.5 text-xs scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {!address && !householdId && (
            <div className="space-y-1">
              <Label htmlFor="pv-custom-address" className="text-xs font-semibold block">
                Address / Location Reference (Optional)
              </Label>
              <Input
                id="pv-custom-address"
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                placeholder="e.g. 124 Maple St / Apt 2B"
                className="h-9 text-xs rounded-xl"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="pv-name" className="text-xs font-semibold block truncate">
                {status === 'note'
                  ? 'Topic / Person Reference (Optional)'
                  : 'Person Name / Reference *'}
              </Label>
              <Input
                id="pv-name"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder={
                  status === 'note'
                    ? 'e.g. Territory notes, parking info, or Maria'
                    : 'e.g. Maria / 2nd floor tenant'
                }
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="pv-status" className="text-xs font-semibold block">
                Ministry Status
              </Label>
              <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                <SelectTrigger id="pv-status" className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">General Note</SelectItem>
                  <SelectItem value="initial_contact">Initial Contact</SelectItem>
                  <SelectItem value="return_visit">Return Visit</SelectItem>
                  <SelectItem value="bible_study">Bible Study</SelectItem>
                  <SelectItem value="interested">Interested</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="pv-phone" className="text-xs font-semibold block">
                Phone Number (Optional)
              </Label>
              <Input
                id="pv-phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 0912-345-6789"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="pv-language" className="text-xs font-semibold block">
                Preferred Language
              </Label>
              <Input
                id="pv-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="e.g. Tagalog / English"
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="pv-scriptures" className="text-xs font-semibold block">
              Scriptures / Topics Discussed
            </Label>
            <Input
              id="pv-scriptures"
              value={scripturesDiscussed}
              onChange={(e) => setScripturesDiscussed(e.target.value)}
              placeholder="e.g. Rev 21:3, 4 - Why does God permit suffering?"
              className="h-9 text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="pv-literature" className="text-xs font-semibold block">
              Literature / Video Shared
            </Label>
            <Input
              id="pv-literature"
              value={literaturePlaced}
              onChange={(e) => setLiteraturePlaced(e.target.value)}
              placeholder="e.g. Enjoy Life Forever! Lesson 1"
              className="h-9 text-xs rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label
                htmlFor="pv-date"
                className="text-xs font-semibold flex items-center gap-1 truncate"
              >
                <Calendar className="h-3 w-3 shrink-0" />
                <span className="truncate">Next Date</span>
              </Label>
              <Input
                id="pv-date"
                type="date"
                value={nextVisitDate}
                onChange={(e) => setNextVisitDate(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="pv-time"
                className="text-xs font-semibold flex items-center gap-1 truncate"
              >
                <Clock className="h-3 w-3 shrink-0" />
                <span className="truncate">Best Time</span>
              </Label>
              <Input
                id="pv-time"
                value={nextVisitTime}
                onChange={(e) => setNextVisitTime(e.target.value)}
                placeholder="e.g. 10:00 AM"
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="pv-notes" className="text-xs font-semibold block">
              Personal Follow-up Notes
            </Label>
            <Textarea
              id="pv-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Private notes about what you agreed to discuss next time..."
              className="text-xs h-20 resize-none rounded-xl"
            />
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground">100% On-Device Privacy:</strong> This note is
              stored only in this browser&apos;s IndexedDB. Other publishers, servants, and
              overseers cannot see this information.
            </p>
          </div>
        </div>

        {/* Fixed Footer with Responsive Action Buttons */}
        <DialogFooter className="shrink-0 px-5 sm:px-6 py-3 sm:py-3.5 border-t border-border/50 bg-card/95 backdrop-blur-xs pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pb-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 w-full">
          {initialCall ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={saving}
              className="text-destructive hover:bg-destructive/10 text-xs gap-1.5 h-9 w-full sm:w-auto justify-center rounded-xl order-2 sm:order-1"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              <span>Delete Note</span>
            </Button>
          ) : (
            <div className="hidden sm:block" />
          )}

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 w-full sm:w-auto shrink-0 order-1 sm:order-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="h-9 text-xs font-medium w-full sm:w-auto justify-center rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-9 text-xs font-semibold w-full sm:w-auto justify-center whitespace-nowrap rounded-xl shadow-xs"
            >
              {saving ? 'Saving...' : 'Save to My Device'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
