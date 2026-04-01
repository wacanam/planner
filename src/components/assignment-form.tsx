'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';

type Props = {
  territoryId: string;
  onSuccess?: () => void;
};

export function AssignmentForm({ territoryId, onSuccess }: Props) {
  const [userId, setUserId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!userId.trim()) {
      setError('User ID is required');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token ?? ''}`,
        },
        body: JSON.stringify({
          territoryId,
          userId: userId.trim(),
          dueAt: dueAt || undefined,
          notes: notes || undefined,
        }),
      });

      const data = (await res.json()) as { success: boolean; error?: { message: string } };
      if (!data.success) {
        setError(data.error?.message ?? 'Failed to assign territory');
      } else {
        setSuccess(true);
        setUserId('');
        setDueAt('');
        setNotes('');
        onSuccess?.();
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert className="bg-red-50 border-red-200 text-red-700 text-sm p-3">{error}</Alert>
      )}
      {success && (
        <Alert className="bg-green-50 border-green-200 text-green-700 text-sm p-3">
          Territory assigned successfully!
        </Alert>
      )}

      <div className="space-y-1">
        <Label htmlFor="userId">User ID</Label>
        <Input
          id="userId"
          placeholder="Enter user ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="dueAt">Due Date (optional)</Label>
        <Input
          id="dueAt"
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input
          id="notes"
          placeholder="Any notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={loading}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Assigning...' : 'Assign Territory'}
      </Button>
    </form>
  );
}
