'use client';

import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PinHouseModeToggleProps {
  active: boolean;
  onToggle: () => void;
}

export function PinHouseModeToggle({ active, onToggle }: PinHouseModeToggleProps) {
  return (
    <Button
      type="button"
      size="icon"
      variant={active ? 'default' : 'secondary'}
      onClick={onToggle}
      title={active ? 'Disable Pin House Mode' : 'Enable Pin House Mode'}
      className="h-9 w-9 rounded-full shadow-md"
    >
      <MapPin className="h-4 w-4" />
      <span className="sr-only">Pin House Mode</span>
    </Button>
  );
}
