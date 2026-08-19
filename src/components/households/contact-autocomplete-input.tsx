'use client';

import { Check, ChevronRight, Sparkles, User, UserPlus, X } from 'lucide-react';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { HouseholdContactSummary } from '@/lib/household-contacts';
import type { Contact } from '@/types/api';

interface ContactAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectContact: (contact: HouseholdContactSummary | Contact) => void;
  onClearSelection?: () => void;
  contacts: (HouseholdContactSummary | Contact)[];
  selectedContact?: HouseholdContactSummary | Contact | null;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function ContactAutocompleteInput({
  value,
  onChange,
  onSelectContact,
  onClearSelection,
  contacts,
  selectedContact,
  placeholder = 'e.g. John Doe',
  id,
  disabled,
  className,
}: ContactAutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const internalId = useId();
  const inputId = id || internalId;

  // Filter contacts based on typed text and prioritize household matches first, then territory, then congregation
  const filteredContacts = useMemo(() => {
    const query = (value || '').trim().toLowerCase();
    const list = query ? contacts.filter((c) => c.name.toLowerCase().includes(query)) : contacts;

    return [...list].sort((a, b) => {
      const scopeOrder: Record<string, number> = {
        household: 1,
        territory: 2,
        congregation: 3,
      };
      const scopeA = 'matchScope' in a && a.matchScope ? (scopeOrder[a.matchScope] ?? 1) : 1;
      const scopeB = 'matchScope' in b && b.matchScope ? (scopeOrder[b.matchScope] ?? 1) : 1;
      if (scopeA !== scopeB) return scopeA - scopeB;

      // Exact match first
      const exactA = a.name.trim().toLowerCase() === query ? 0 : 1;
      const exactB = b.name.trim().toLowerCase() === query ? 0 : 1;
      if (exactA !== exactB) return exactA - exactB;

      return a.name.localeCompare(b.name);
    });
  }, [contacts, value]);

  // Check if current typed value is an exact match for an existing contact
  const exactMatch = useMemo(() => {
    const query = (value || '').trim().toLowerCase();
    if (!query) return null;
    return contacts.find((c) => c.name.trim().toLowerCase() === query) || null;
  }, [contacts, value]);

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

  const handleSelect = (contact: HouseholdContactSummary | Contact) => {
    onChange(contact.name);
    onSelectContact(contact);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredContacts.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredContacts.length) {
        e.preventDefault();
        handleSelect(filteredContacts[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Input
          ref={inputRef}
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
            if (selectedContact && selectedContact.name !== e.target.value) {
              onClearSelection?.();
            }
          }}
          onFocus={() => {
            if (contacts.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={`h-9 rounded-xl text-xs bg-background pr-8 ${className || ''}`}
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              onClearSelection?.();
              inputRef.current?.focus();
            }}
            className="absolute right-2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
            tabIndex={-1}
            title="Clear name"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-[calc(100vw-32px)] sm:w-[150%] min-w-[340px] max-w-lg rounded-2xl bg-popover border border-border shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 max-h-64 overflow-y-auto">
          {filteredContacts.length > 0 ? (
            <div className="p-1.5 space-y-0.5">
              <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {value.trim()
                  ? `Matching Contacts (${filteredContacts.length})`
                  : `Known Residents (${contacts.length})`}
              </div>
              {filteredContacts.map((contact, index) => {
                const isHighlighted = index === highlightedIndex;
                const isSelected =
                  selectedContact?.name.toLowerCase() === contact.name.toLowerCase();
                const visitCount =
                  'encountersCount' in contact ? contact.encountersCount : undefined;
                const creator =
                  'creatorName' in contact && contact.creatorName ? contact.creatorName : undefined;

                return (
                  <button
                    key={'id' in contact && contact.id ? contact.id : contact.name}
                    type="button"
                    onClick={() => handleSelect(contact)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-3 transition-colors ${
                      isHighlighted || isSelected
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="truncate block font-semibold text-foreground">
                          {contact.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                          {contact.gender && contact.gender !== 'unknown' && (
                            <span className="capitalize">{contact.gender}</span>
                          )}
                          {contact.ageGroup && contact.ageGroup !== 'unknown' && (
                            <span>· {contact.ageGroup.replace(/_/g, ' ')}</span>
                          )}
                          {contact.language && <span>· {contact.language}</span>}
                          {creator &&
                            'matchScope' in contact &&
                            (contact.matchScope === 'territory' ||
                              contact.matchScope === 'congregation') && (
                              <span className="text-primary/90 font-medium">
                                · First by {creator}
                              </span>
                            )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {/* Match Scope / Location Badge */}
                      {'matchScope' in contact && contact.matchScope === 'household' ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-bold"
                        >
                          🏠 At this address
                        </Badge>
                      ) : 'matchScope' in contact && contact.matchScope === 'territory' ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 font-bold max-w-[160px] truncate"
                          title={`${contact.householdAddress || 'Territory'}${creator ? ` · Recorded by ${creator}` : ''}`}
                        >
                          🗺️ {contact.householdAddress || 'Territory'}
                        </Badge>
                      ) : 'matchScope' in contact && contact.matchScope === 'congregation' ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4.5 bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 font-bold max-w-[160px] truncate"
                          title={`${contact.householdAddress || 'Congregation'}${creator ? ` · Recorded by ${creator}` : ''}`}
                        >
                          🏛️ {contact.householdAddress || 'Congregation'}
                        </Badge>
                      ) : null}

                      {visitCount !== undefined && visitCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4.5 font-bold border-border"
                        >
                          {visitCount}v
                        </Badge>
                      )}
                      {contact.bibleStudyInterest && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4.5 bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20 font-bold"
                        >
                          Study
                        </Badge>
                      )}
                      {isSelected && <Check size={13} className="text-primary ml-0.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : value.trim() ? (
            <div className="p-3 text-center text-xs text-muted-foreground">
              <div className="flex items-center justify-center gap-1.5 font-medium text-foreground">
                <UserPlus size={14} className="text-primary" />
                <span>New Person: "{value.trim()}"</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                A new contact profile will be created at this address.
              </p>
            </div>
          ) : null}

          {value.trim() && !exactMatch && filteredContacts.length > 0 && (
            <div className="p-1 border-t border-border/60 bg-muted/20">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onClearSelection?.();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium"
              >
                <UserPlus size={12} className="text-primary" />
                <span>Create new person: &ldquo;{value.trim()}&rdquo;</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
