'use client';

import {
  Bold,
  Code,
  Eye,
  FileCode,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  PenTool,
  Quote,
  Sparkles,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { playHapticFeedback } from '@/lib/sound';

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  minHeight?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write in Markdown...',
  rows = 8,
  className = '',
  minHeight = '180px',
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = (prefix: string, suffix = '', defaultText = 'text') => {
    playHapticFeedback('light');
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value}${prefix}${defaultText}${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);

    const replacement = selected ? `${prefix}${selected}${suffix}` : `${prefix}${defaultText}${suffix}`;
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = selected ? start + replacement.length : start + prefix.length;
      const newCursorEnd = selected ? start + replacement.length : start + prefix.length + defaultText.length;
      textarea.setSelectionRange(newCursorPos, newCursorEnd);
    }, 10);
  };

  const applyLinePrefix = (prefix: string) => {
    playHapticFeedback('light');
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value}\n${prefix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Find the start of the current line
    const lastNewline = value.lastIndexOf('\n', start - 1);
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

    const newValue = value.substring(0, lineStart) + prefix + value.substring(lineStart);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);
  };

  const handleInsertLink = () => {
    const url = window.prompt('Enter URL link (e.g. https://jw.org):', 'https://');
    if (!url) return;
    const label = window.prompt('Enter Link Text:', 'Learn more') || 'Link';
    applyFormat(`[${label}](`, `)`, url);
  };

  return (
    <div className={`rounded-lg border border-input bg-card shadow-2xs overflow-hidden transition-all focus-within:ring-1 focus-within:ring-ring ${className}`}>
      {/* Header Toolbar & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border bg-muted/40 px-2 py-1 text-xs">
        {/* Formatting Buttons */}
        <div className="flex flex-wrap items-center gap-0.5">
          <button
            type="button"
            title="Bold (**text**)"
            onClick={() => applyFormat('**', '**', 'bold text')}
            disabled={activeTab === 'preview'}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Italic (*text*)"
            onClick={() => applyFormat('*', '*', 'italic text')}
            disabled={activeTab === 'preview'}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <span className="h-3 w-[1px] bg-border mx-0.5" />

          <button
            type="button"
            title="Heading 2"
            onClick={() => applyLinePrefix('## ')}
            disabled={activeTab === 'preview'}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Heading 3"
            onClick={() => applyLinePrefix('### ')}
            disabled={activeTab === 'preview'}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </button>
          <span className="h-3 w-[1px] bg-border mx-0.5" />

          <button
            type="button"
            title="Bulleted List"
            onClick={() => applyLinePrefix('• ')}
            disabled={activeTab === 'preview'}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Numbered List"
            onClick={() => applyLinePrefix('1. ')}
            disabled={activeTab === 'preview'}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Quote"
            onClick={() => applyLinePrefix('> ')}
            disabled={activeTab === 'preview'}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <Quote className="h-3.5 w-3.5" />
          </button>
          <span className="h-3 w-[1px] bg-border mx-0.5" />

          <button
            type="button"
            title="Inline Code"
            onClick={() => applyFormat('`', '`', 'code')}
            disabled={activeTab === 'preview'}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <Code className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Code Block"
            onClick={() => applyFormat('```\n', '\n```', 'code block')}
            disabled={activeTab === 'preview'}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <FileCode className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Insert Link"
            onClick={handleInsertLink}
            disabled={activeTab === 'preview'}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Divider line"
            onClick={() => applyLinePrefix('\n---\n')}
            disabled={activeTab === 'preview'}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Mode Switcher: Write vs Preview */}
        <div className="flex items-center rounded-md bg-background p-0.5 border border-border">
          <button
            type="button"
            onClick={() => {
              playHapticFeedback('light');
              setActiveTab('write');
            }}
            className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold transition-all ${
              activeTab === 'write'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <PenTool className="h-3 w-3" />
            Write
          </button>
          <button
            type="button"
            onClick={() => {
              playHapticFeedback('light');
              setActiveTab('preview');
            }}
            className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold transition-all ${
              activeTab === 'preview'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="h-3 w-3" />
            Preview
          </button>
        </div>
      </div>

      {/* Body Area: Textarea or Live Preview */}
      <div className="p-2.5 bg-card" style={{ minHeight }}>
        {activeTab === 'write' ? (
          <textarea
            ref={textareaRef}
            rows={rows}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent font-sans text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden leading-relaxed resize-y"
            style={{ minHeight: '120px' }}
          />
        ) : (
          <div className="min-h-[120px] p-2 bg-muted/20 rounded-md border border-border/40">
            {value.trim() ? (
              <MarkdownRenderer content={value} />
            ) : (
              <div className="flex h-24 items-center justify-center text-xs text-muted-foreground italic">
                Nothing to preview yet. Switch to Write tab to add content.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer markdown hints */}
      <div className="flex items-center justify-between border-t border-border/40 bg-muted/20 px-2.5 py-0.5 text-[10px] text-muted-foreground">
        <span>Markdown: **bold**, *italic*, # headings, • lists, [links](url)</span>
        <span className="font-mono">{value.length} chars</span>
      </div>
    </div>
  );
}
