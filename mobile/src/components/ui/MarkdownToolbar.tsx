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
} from 'lucide-react-native';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { triggerHaptic } from '@/lib/sound';

export interface MarkdownToolbarProps {
  value: string;
  onChange: (text: string) => void;
  activeTab: 'write' | 'preview';
  onTabChange: (tab: 'write' | 'preview') => void;
}

export function MarkdownToolbar({
  value,
  onChange,
  activeTab,
  onTabChange,
}: MarkdownToolbarProps) {
  const { colors, typography, spacing, radius } = useTheme();

  const handleWrap = (prefix: string, suffix = '', defaultText = 'text') => {
    triggerHaptic('light');
    if (!value) {
      onChange(`${prefix}${defaultText}${suffix}`);
      return;
    }
    onChange(`${value}\n${prefix}${defaultText}${suffix}`);
  };

  const handleInsertPrefix = (prefix: string) => {
    triggerHaptic('light');
    if (!value) {
      onChange(prefix);
      return;
    }
    onChange(`${value}\n${prefix}`);
  };

  const handleInsertLink = () => {
    triggerHaptic('light');
    Alert.prompt
      ? Alert.prompt(
          'Insert Link',
          'Enter web URL (e.g. https://jw.org):',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Insert',
              onPress: (url?: string) => {
                if (url) {
                  onChange(`${value} [Learn More](${url.trim()})`);
                }
              },
            },
          ],
          'plain-text',
          'https://'
        )
      : handleWrap('[Learn More](', ')', 'https://jw.org');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: `${colors.primary}08`,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <TouchableOpacity
            disabled={activeTab === 'preview'}
            onPress={() => handleWrap('**', '**', 'bold text')}
            style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Bold size={14} color={activeTab === 'preview' ? colors.mutedForeground : colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            disabled={activeTab === 'preview'}
            onPress={() => handleWrap('*', '*', 'italic text')}
            style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Italic size={14} color={activeTab === 'preview' ? colors.mutedForeground : colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            disabled={activeTab === 'preview'}
            onPress={() => handleInsertPrefix('## ')}
            style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Heading2 size={14} color={activeTab === 'preview' ? colors.mutedForeground : colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            disabled={activeTab === 'preview'}
            onPress={() => handleInsertPrefix('### ')}
            style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Heading3 size={14} color={activeTab === 'preview' ? colors.mutedForeground : colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            disabled={activeTab === 'preview'}
            onPress={() => handleInsertPrefix('• ')}
            style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <List size={14} color={activeTab === 'preview' ? colors.mutedForeground : colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            disabled={activeTab === 'preview'}
            onPress={() => handleInsertPrefix('1. ')}
            style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <ListOrdered size={14} color={activeTab === 'preview' ? colors.mutedForeground : colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            disabled={activeTab === 'preview'}
            onPress={() => handleInsertPrefix('> ')}
            style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Quote size={14} color={activeTab === 'preview' ? colors.mutedForeground : colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            disabled={activeTab === 'preview'}
            onPress={() => handleWrap('`', '`', 'code')}
            style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Code size={14} color={activeTab === 'preview' ? colors.mutedForeground : colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            disabled={activeTab === 'preview'}
            onPress={handleInsertLink}
            style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <LinkIcon size={14} color={activeTab === 'preview' ? colors.mutedForeground : colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            disabled={activeTab === 'preview'}
            onPress={() => handleInsertPrefix('---')}
            style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Minus size={14} color={activeTab === 'preview' ? colors.mutedForeground : colors.foreground} />
          </TouchableOpacity>
        </ScrollView>

        {/* Tab switch */}
        <View style={[styles.tabGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              onTabChange('write');
            }}
            style={[
              styles.tabBtn,
              activeTab === 'write' && { backgroundColor: colors.primary },
            ]}
          >
            <PenTool
              size={12}
              color={activeTab === 'write' ? '#ffffff' : colors.mutedForeground}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'write' ? '#ffffff' : colors.mutedForeground },
              ]}
            >
              Write
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              onTabChange('preview');
            }}
            style={[
              styles.tabBtn,
              activeTab === 'preview' && { backgroundColor: colors.primary },
            ]}
          >
            <Eye
              size={12}
              color={activeTab === 'preview' ? '#ffffff' : colors.mutedForeground}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'preview' ? '#ffffff' : colors.mutedForeground },
              ]}
            >
              Preview
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 6,
    marginBottom: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingRight: 6,
  },
  btn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 7,
    padding: 2,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 5,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
