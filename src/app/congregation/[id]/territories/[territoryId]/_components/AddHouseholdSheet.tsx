'use client';

import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { queueHousehold } from '@/lib/visits-store';

interface AddHouseholdSheetProps {
  lat: number;
  lng: number;
  territoryId?: string;
  congregationId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddHouseholdSheet({
  lat,
  lng,
  territoryId,
  congregationId,
  onClose,
  onSuccess,
}: AddHouseholdSheetProps) {
  const [address, setAddress] = useState('');
  const [streetName, setStreetName] = useState('');
  const [city, setCity] = useState('');
  const [type, setType] = useState('house');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || !streetName.trim() || !city.trim()) {
      setError('Address, street name, and city are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await queueHousehold({
        address: address.trim(),
        streetName: streetName.trim(),
        city: city.trim(),
        type,
        notes: notes.trim() || null,
        latitude: String(lat),
        longitude: String(lng),
        ...(territoryId ? { territoryId } : {}),
        ...(congregationId ? { congregationId } : {}),
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err) {
      console.error('[AddHouseholdSheet] Failed to queue household:', err);
      setError('Failed to queue household. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2050] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close sheet"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        className="relative bg-background rounded-t-3xl shadow-2xl border-t border-border max-h-[85vh] overflow-y-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
          <div>
            <p className="font-bold text-foreground">Add Household</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              📍 {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-accent/20"
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check size={24} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-semibold text-foreground">Household queued!</p>
            <p className="text-xs text-muted-foreground">It will sync when you're online.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground" htmlFor="add-hh-address">
                Address *
              </label>
              <input
                id="add-hh-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="House number and street"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground" htmlFor="add-hh-street">
                Street Name *
              </label>
              <input
                id="add-hh-street"
                type="text"
                value={streetName}
                onChange={(e) => setStreetName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Street name"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground" htmlFor="add-hh-city">
                City *
              </label>
              <input
                id="add-hh-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="City"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground" htmlFor="add-hh-lat">
                  Latitude
                </label>
                <input
                  id="add-hh-lat"
                  type="text"
                  value={lat.toFixed(6)}
                  readOnly
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-muted text-muted-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground" htmlFor="add-hh-lng">
                  Longitude
                </label>
                <input
                  id="add-hh-lng"
                  type="text"
                  value={lng.toFixed(6)}
                  readOnly
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-muted text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground" htmlFor="add-hh-type">
                Type
              </label>
              <select
                id="add-hh-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="house">House</option>
                <option value="apartment">Apartment</option>
                <option value="business">Business</option>
                <option value="condo">Condo</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground" htmlFor="add-hh-notes">
                Notes
              </label>
              <textarea
                id="add-hh-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Optional notes"
              />
            </div>

            {error && (
              <p className="text-xs text-destructive font-medium">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save Household'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
