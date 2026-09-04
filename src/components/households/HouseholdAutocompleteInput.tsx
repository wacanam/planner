// src/components/households/HouseholdAutocompleteInput.tsx
'use client';

import { Check, Home, MapPin, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { Household } from '@/types/api';

export type HouseholdLike = Partial<Household> & {
  id: string;
  address: string;
  houseNumber?: string | null;
  streetName?: string;
  city?: string;
  territoryId?: string | null;
  status?: string;
  notes?: string | null;
};

interface HouseholdAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectHousehold: (household: HouseholdLike) => void;
  onClearSelection?: () => void;
  selectedHouseholdId?: string | null;
  households: HouseholdLike[];
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function HouseholdAutocompleteInput({
  value,
  onChange,
  onSelectHousehold,
  onClearSelection,
  selectedHouseholdId,
  households,
  placeholder = 'e.g. 124 Maple St / Apt 2B (or search existing household)',
  id,
  disabled,
  className,
}: HouseholdAutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const internalId = useId();
  const inputId = id || internalId;

  // Debounce typed text (150ms)
  useEffect(() => {
    const trimmed = (value || '').trim();
    const timer = setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, 150);
    return () => clearTimeout(timer);
  }, [value]);

  // Find linked household if selectedHouseholdId is present
  const linkedHousehold = useMemo(() => {
    if (!selectedHouseholdId) return null;
    return households.find((h) => h.id === selectedHouseholdId) || null;
  }, [households, selectedHouseholdId]);

  // Filter households based on query
  const filteredHouseholds = useMemo(() => {
    const query = debouncedQuery.toLowerCase();
    if (!query || query.length < 1) {
      return [];
    }

    const cleanNum = query.replace(/^#\s*/, '');

    const matches = households.filter((h) => {
      const addr = (h.address || '').toLowerCase();
      const street = (h.streetName || '').toLowerCase();
      const houseNo = (h.houseNumber || '').toLowerCase();
      const city = (h.city || '').toLowerCase();
      const notes = (h.notes || '').toLowerCase();

      return (
        addr.includes(query) ||
        street.includes(query) ||
        city.includes(query) ||
        notes.includes(query) ||
        (houseNo && (houseNo.includes(cleanNum) || houseNo.includes(query)))
      );
    });

    // Sort: exact house number match first, then street match, then alphabetical
    return matches
      .sort((a, b) => {
        const aNo = (a.houseNumber || '').toLowerCase().replace(/^#\s*/, '');
        const bNo = (b.houseNumber || '').toLowerCase().replace(/^#\s*/, '');
        if (aNo === cleanNum && bNo !== cleanNum) return -1;
        if (bNo === cleanNum && aNo !== cleanNum) return 1;

        const aStreet = (a.streetName || a.address || '').toLowerCase();
        const bStreet = (b.streetName || b.address || '').toLowerCase();
        const aStarts = aStreet.startsWith(query) ? 0 : 1;
        const bStarts = bStreet.startsWith(query) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;

        return aStreet.localeCompare(bStreet);
      })
      .slice(0, 8); // Top 8 matches for responsiveness
  }, [households, debouncedQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatHouseholdLabel = (h: HouseholdLike): string => {
    const no = (h.houseNumber || '').trim();
    const formattedNo = no ? (no.startsWith('#') ? `${no} ` : `#${no} `) : '';
    const street = (h.streetName || h.address || '').trim();
    if (formattedNo && street.startsWith(formattedNo.trim())) {
      return street;
    }
    return `${formattedNo}${street}`.trim() || h.address || 'Household';
  };

  const handleSelect = (h: HouseholdLike) => {
    const formatted = formatHouseholdLabel(h);
    onChange(formatted);
    onSelectHousehold(h);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      !isOpen &&
      (value || '').trim().length >= 1 &&
      (e.key === 'ArrowDown' || e.key === 'ArrowUp')
    ) {
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredHouseholds.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredHouseholds.length) {
        e.preventDefault();
        handleSelect(filteredHouseholds[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const showDropdown = isOpen && (value || '').trim().length >= 1;

  return (
    <div ref={containerRef} className="relative w-full space-y-1.5">
      <div className="relative flex items-center">
        <Input
          ref={inputRef}
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => {
            const nextVal = e.target.value;
            onChange(nextVal);
            if (nextVal.trim().length >= 1) {
              setIsOpen(true);
            } else {
              setIsOpen(false);
            }
            if (selectedHouseholdId) {
              onClearSelection?.();
            }
          }}
          onFocus={() => {
            if ((value || '').trim().length >= 1) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={`h-9 text-xs bg-background pr-8 rounded-xl ${className || ''}`}
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setDebouncedQuery('');
              setIsOpen(false);
              onClearSelection?.();
              inputRef.current?.focus();
            }}
            className="absolute right-2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
            tabIndex={-1}
            title="Clear address"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Linked Household Indicator */}
      {linkedHousehold && (
        <div className="flex items-center gap-1.5 text-[11px] text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-xl w-fit">
          <Home className="h-3 w-3 shrink-0" />
          <span className="font-semibold">Linked to Household:</span>
          <span className="truncate max-w-[220px]">{formatHouseholdLabel(linkedHousehold)}</span>
          <button
            type="button"
            onClick={() => onClearSelection?.()}
            className="ml-1 text-primary/60 hover:text-destructive hover:bg-destructive/10 rounded-full p-0.5 transition-colors"
            title="Unlink household (keep text as custom reference)"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 top-full mt-1 z-50 w-full rounded-2xl bg-popover border border-border shadow-xl overflow-hidden max-h-60 overflow-y-auto scrollbar-none">
          {filteredHouseholds.length > 0 ? (
            <div className="p-1.5 space-y-0.5">
              <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Congregation Households ({filteredHouseholds.length})
              </div>
              {filteredHouseholds.map((h, index) => {
                const isSelected = selectedHouseholdId === h.id;
                const isHighlighted = highlightedIndex === index;
                const title = formatHouseholdLabel(h);

                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => handleSelect(h)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer text-xs ${
                      isHighlighted || isSelected
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted/60 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Home className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-foreground truncate">
                            {title}
                          </span>
                          {h.status && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 capitalize text-muted-foreground border-border/60 shrink-0"
                            >
                              {h.status.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                        {(h.city || h.notes) && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {h.city ? h.city : ''}
                            {h.city && h.notes ? ' · ' : ''}
                            {h.notes ? h.notes : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-muted-foreground">
              <MapPin className="h-4 w-4 mx-auto mb-1 opacity-50" />
              <p>No congregation households match &ldquo;{debouncedQuery}&rdquo;.</p>
              <p className="text-[10px] mt-0.5 text-muted-foreground/80">
                You can keep this as a custom address or location reference.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
