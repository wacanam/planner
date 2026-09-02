'use client';

import { ExternalLink } from 'lucide-react';
import React, { type ReactNode } from 'react';

export interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Render inline markdown (Bold, Italic, Strikethrough, Code, Links).
 */
function renderInline(text: string): ReactNode[] {
  const elements: ReactNode[] = [];
  // Tokenize regex matching: links [label](url), bold **text** or __text__, italic *text* or _text_, strike ~~text~~, code `text`
  const inlineRegex =
    /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|`([^`]+)`|\*([^*]+)\*|_([^_]+)_)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }

    const fullMatch = match[0];
    if (match[2] !== undefined && match[3] !== undefined) {
      // Link: [label](url)
      const label = match[2];
      const url = match[3];
      const isExternal = url.startsWith('http://') || url.startsWith('https://');
      elements.push(
        <a
          key={`link-${key++}`}
          href={url}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="inline-flex items-center gap-0.5 font-semibold text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        >
          <span>{label}</span>
          {isExternal && <ExternalLink className="inline h-3 w-3 ml-0.5 opacity-70" />}
        </a>
      );
    } else if (match[4] !== undefined || match[5] !== undefined) {
      // Bold: **text** or __text__
      const boldText = match[4] ?? match[5];
      elements.push(
        <strong key={`bold-${key++}`} className="font-bold text-foreground">
          {boldText}
        </strong>
      );
    } else if (match[6] !== undefined) {
      // Strikethrough: ~~text~~
      elements.push(
        <del key={`del-${key++}`} className="line-through text-muted-foreground">
          {match[6]}
        </del>
      );
    } else if (match[7] !== undefined) {
      // Inline code: `text`
      elements.push(
        <code
          key={`code-${key++}`}
          className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground border border-border/60"
        >
          {match[7]}
        </code>
      );
    } else if (match[8] !== undefined || match[9] !== undefined) {
      // Italic: *text* or _text_
      const italicText = match[8] ?? match[9];
      elements.push(
        <em key={`italic-${key++}`} className="italic text-foreground/90">
          {italicText}
        </em>
      );
    } else {
      elements.push(fullMatch);
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content || !content.trim()) return null;

  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let blockKey = 0;

  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLang = '';

  let currentListType: 'ul' | 'ol' | null = null;
  let currentListItems: ReactNode[] = [];

  const flushList = () => {
    if (!currentListType || currentListItems.length === 0) return;
    if (currentListType === 'ul') {
      blocks.push(
        <ul key={`ul-${blockKey++}`} className="my-2 ml-4 list-disc space-y-1 text-sm text-foreground/90">
          {currentListItems}
        </ul>
      );
    } else {
      blocks.push(
        <ol key={`ol-${blockKey++}`} className="my-2 ml-4 list-decimal space-y-1 text-sm text-foreground/90">
          {currentListItems}
        </ol>
      );
    }
    currentListType = null;
    currentListItems = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced Code Block
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        flushList();
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeBlockLines = [];
      } else {
        inCodeBlock = false;
        blocks.push(
          <div key={`codeblock-${blockKey++}`} className="my-3 overflow-x-auto rounded-lg bg-muted/90 p-3 border border-border">
            {codeBlockLang && (
              <div className="mb-1 text-[10px] font-mono font-bold uppercase text-muted-foreground">
                {codeBlockLang}
              </div>
            )}
            <pre className="font-mono text-xs text-foreground leading-relaxed whitespace-pre">
              {codeBlockLines.join('\n')}
            </pre>
          </div>
        );
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Horizontal Rule
    if (/^(---+|\*\*\*+|___+)$/.test(line.trim())) {
      flushList();
      blocks.push(<hr key={`hr-${blockKey++}`} className="my-3 border-t border-border" />);
      continue;
    }

    // Headings
    if (line.startsWith('#')) {
      flushList();
      if (line.startsWith('#### ')) {
        blocks.push(
          <h5 key={`h4-${blockKey++}`} className="mt-3 mb-1 text-xs font-bold uppercase tracking-wider text-foreground">
            {renderInline(line.slice(5))}
          </h5>
        );
        continue;
      }
      if (line.startsWith('### ')) {
        blocks.push(
          <h4 key={`h3-${blockKey++}`} className="mt-3 mb-1 text-sm font-bold text-foreground">
            {renderInline(line.slice(4))}
          </h4>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        blocks.push(
          <h3 key={`h2-${blockKey++}`} className="mt-4 mb-1.5 text-base font-bold text-foreground">
            {renderInline(line.slice(3))}
          </h3>
        );
        continue;
      }
      if (line.startsWith('# ')) {
        blocks.push(
          <h2 key={`h1-${blockKey++}`} className="mt-4 mb-2 text-lg font-extrabold text-foreground">
            {renderInline(line.slice(2))}
          </h2>
        );
        continue;
      }
    }

    // Blockquote
    if (line.startsWith('>')) {
      flushList();
      const quoteContent = line.replace(/^>\s?/, '');
      blocks.push(
        <blockquote
          key={`quote-${blockKey++}`}
          className="my-2 border-l-3 border-primary/60 bg-primary/5 pl-3 py-1 text-sm italic text-foreground/90 rounded-r-md"
        >
          {renderInline(quoteContent)}
        </blockquote>
      );
      continue;
    }

    // Unordered List Items (- , * , • )
    const bulletMatch = line.match(/^(\s*)([-*•])\s+(.+)$/);
    if (bulletMatch) {
      if (currentListType !== 'ul') {
        flushList();
        currentListType = 'ul';
      }
      currentListItems.push(
        <li key={`li-${blockKey++}`} className="leading-relaxed">
          {renderInline(bulletMatch[3])}
        </li>
      );
      continue;
    }

    // Ordered List Items (1. , 2. )
    const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
    if (orderedMatch) {
      if (currentListType !== 'ol') {
        flushList();
        currentListType = 'ol';
      }
      currentListItems.push(
        <li key={`oli-${blockKey++}`} className="leading-relaxed">
          {renderInline(orderedMatch[3])}
        </li>
      );
      continue;
    }

    // Empty line -> flush list
    if (!line.trim()) {
      flushList();
      continue;
    }

    // Regular Paragraph line
    flushList();
    blocks.push(
      <p key={`p-${blockKey++}`} className="my-1.5 text-sm text-foreground/90 leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }

  flushList();

  return <div className={`space-y-1 break-words ${className}`}>{blocks}</div>;
}
