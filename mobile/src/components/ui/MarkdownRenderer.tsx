import * as Linking from 'expo-linking';
import type { ReactNode } from 'react';
import { Text, type TextStyle, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { triggerHaptic } from '@/lib/sound';

export interface MarkdownRendererProps {
  content: string;
  style?: ViewStyle;
  baseTextStyle?: TextStyle;
}

/**
 * Parses inline markdown tokens (links, bold, italic, strikethrough, code)
 */
function renderInlineText(
  text: string,
  colors: any,
  typography: any,
  baseStyle?: TextStyle
): ReactNode[] {
  const elements: ReactNode[] = [];
  const inlineRegex =
    /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|`([^`]+)`|\*([^*]+)\*|_([^_]+)_)/g;

  let lastIndex = 0;
  let match = inlineRegex.exec(text);
  let key = 0;

  const handlePressLink = async (url: string) => {
    try {
      await triggerHaptic('light');
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch {}
  };

  while (match !== null) {
    if (match.index > lastIndex) {
      elements.push(
        <Text key={`t-${key++}`} style={baseStyle}>
          {text.substring(lastIndex, match.index)}
        </Text>
      );
    }

    const fullMatch = match[0];

    if (match[2] !== undefined && match[3] !== undefined) {
      // Link: [label](url)
      const label = match[2];
      const url = match[3];
      elements.push(
        <Text
          key={`link-${key++}`}
          onPress={() => handlePressLink(url)}
          style={[
            baseStyle,
            {
              color: colors.primary,
              fontWeight: '600',
              textDecorationLine: 'underline',
            },
          ]}
        >
          {label}
        </Text>
      );
    } else if (match[4] !== undefined || match[5] !== undefined) {
      // Bold: **text** or __text__
      const boldText = match[4] ?? match[5];
      elements.push(
        <Text
          key={`bold-${key++}`}
          style={[baseStyle, { fontWeight: 'bold', color: colors.foreground }]}
        >
          {boldText}
        </Text>
      );
    } else if (match[6] !== undefined) {
      // Strikethrough: ~~text~~
      elements.push(
        <Text
          key={`del-${key++}`}
          style={[baseStyle, { textDecorationLine: 'line-through', color: colors.mutedForeground }]}
        >
          {match[6]}
        </Text>
      );
    } else if (match[7] !== undefined) {
      // Inline code: `text`
      elements.push(
        <Text
          key={`code-${key++}`}
          style={[
            baseStyle,
            {
              fontFamily: 'monospace',
              fontSize: (baseStyle?.fontSize || typography.sm) - 1,
              backgroundColor: `${colors.primary}15`,
              color: colors.foreground,
              paddingHorizontal: 4,
              paddingVertical: 1,
              borderRadius: 4,
            },
          ]}
        >
          {match[7]}
        </Text>
      );
    } else if (match[8] !== undefined || match[9] !== undefined) {
      // Italic: *text* or _text_
      const italicText = match[8] ?? match[9];
      elements.push(
        <Text
          key={`italic-${key++}`}
          style={[baseStyle, { fontStyle: 'italic', color: colors.foreground }]}
        >
          {italicText}
        </Text>
      );
    } else {
      elements.push(
        <Text key={`t-${key++}`} style={baseStyle}>
          {fullMatch}
        </Text>
      );
    }

    lastIndex = match.index + fullMatch.length;
    match = inlineRegex.exec(text);
  }

  if (lastIndex < text.length) {
    elements.push(
      <Text key={`t-${key++}`} style={baseStyle}>
        {text.substring(lastIndex)}
      </Text>
    );
  }

  return elements;
}

export function MarkdownRenderer({ content, style, baseTextStyle }: MarkdownRendererProps) {
  const { colors, typography, spacing, radius } = useTheme();

  if (!content?.trim()) return null;

  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let blockKey = 0;

  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  const defaultTextStyle: TextStyle = {
    color: colors.foreground,
    fontSize: typography.sm,
    lineHeight: 20,
    ...baseTextStyle,
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced Code Block
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLines = [];
      } else {
        inCodeBlock = false;
        blocks.push(
          <View
            key={`codeblock-${blockKey++}`}
            style={{
              backgroundColor: `${colors.primary}10`,
              borderColor: `${colors.primary}25`,
              borderWidth: 1,
              borderRadius: radius.md,
              padding: spacing.sm,
              marginVertical: 4,
            }}
          >
            <Text
              style={{
                fontFamily: 'monospace',
                fontSize: typography.xs,
                color: colors.foreground,
                lineHeight: 18,
              }}
            >
              {codeBlockLines.join('\n')}
            </Text>
          </View>
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
      blocks.push(
        <View
          key={`hr-${blockKey++}`}
          style={{
            height: 1,
            backgroundColor: colors.border,
            marginVertical: spacing.sm,
          }}
        />
      );
      continue;
    }

    // Headings
    if (line.startsWith('#')) {
      if (line.startsWith('#### ')) {
        blocks.push(
          <Text
            key={`h4-${blockKey++}`}
            style={{
              fontSize: typography.xs,
              fontWeight: '700',
              color: colors.foreground,
              textTransform: 'uppercase',
              marginTop: spacing.xs,
              marginBottom: 2,
            }}
          >
            {renderInlineText(line.slice(5), colors, typography, defaultTextStyle)}
          </Text>
        );
        continue;
      }
      if (line.startsWith('### ')) {
        blocks.push(
          <Text
            key={`h3-${blockKey++}`}
            style={{
              fontSize: typography.sm + 1,
              fontWeight: '700',
              color: colors.foreground,
              marginTop: spacing.xs,
              marginBottom: 2,
            }}
          >
            {renderInlineText(line.slice(4), colors, typography, defaultTextStyle)}
          </Text>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        blocks.push(
          <Text
            key={`h2-${blockKey++}`}
            style={{
              fontSize: typography.base,
              fontWeight: '700',
              color: colors.foreground,
              marginTop: spacing.sm,
              marginBottom: 3,
            }}
          >
            {renderInlineText(line.slice(3), colors, typography, defaultTextStyle)}
          </Text>
        );
        continue;
      }
      if (line.startsWith('# ')) {
        blocks.push(
          <Text
            key={`h1-${blockKey++}`}
            style={{
              fontSize: typography.lg,
              fontWeight: '800',
              color: colors.foreground,
              marginTop: spacing.sm,
              marginBottom: 4,
            }}
          >
            {renderInlineText(line.slice(2), colors, typography, defaultTextStyle)}
          </Text>
        );
        continue;
      }
    }

    // Blockquote
    if (line.startsWith('>')) {
      const quoteContent = line.replace(/^>\s?/, '');
      blocks.push(
        <View
          key={`quote-${blockKey++}`}
          style={{
            borderLeftWidth: 3,
            borderLeftColor: colors.primary,
            backgroundColor: `${colors.primary}08`,
            paddingLeft: spacing.sm,
            paddingVertical: 4,
            borderRadius: radius.xs,
            marginVertical: 4,
          }}
        >
          <Text style={[defaultTextStyle, { fontStyle: 'italic', color: colors.foreground }]}>
            {renderInlineText(quoteContent, colors, typography, defaultTextStyle)}
          </Text>
        </View>
      );
      continue;
    }

    // Unordered List Items (- , * , • )
    const bulletMatch = line.match(/^(\s*)([-*•])\s+(.+)$/);
    if (bulletMatch) {
      blocks.push(
        <View
          key={`bullet-${blockKey++}`}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginVertical: 2,
            paddingLeft: 4,
          }}
        >
          <Text
            style={[
              defaultTextStyle,
              { fontWeight: 'bold', color: colors.primary, marginRight: 6 },
            ]}
          >
            •
          </Text>
          <Text style={[defaultTextStyle, { flex: 1 }]}>
            {renderInlineText(bulletMatch[3], colors, typography, defaultTextStyle)}
          </Text>
        </View>
      );
      continue;
    }

    // Ordered List Items (1. , 2. )
    const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
    if (orderedMatch) {
      const num = orderedMatch[2];
      blocks.push(
        <View
          key={`ordered-${blockKey++}`}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginVertical: 2,
            paddingLeft: 4,
          }}
        >
          <Text
            style={[defaultTextStyle, { fontWeight: '700', color: colors.primary, marginRight: 6 }]}
          >
            {num}.
          </Text>
          <Text style={[defaultTextStyle, { flex: 1 }]}>
            {renderInlineText(orderedMatch[3], colors, typography, defaultTextStyle)}
          </Text>
        </View>
      );
      continue;
    }

    // Blank lines
    if (!line.trim()) {
      blocks.push(<View key={`blank-${blockKey++}`} style={{ height: 6 }} />);
      continue;
    }

    // Normal paragraph line
    blocks.push(
      <Text key={`p-${blockKey++}`} style={[defaultTextStyle, { marginVertical: 2 }]}>
        {renderInlineText(line, colors, typography, defaultTextStyle)}
      </Text>
    );
  }

  return <View style={style}>{blocks}</View>;
}
