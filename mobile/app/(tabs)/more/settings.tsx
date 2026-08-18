// mobile/app/(tabs)/more/settings.tsx
import { useRouter } from 'expo-router';
import { Bell, Moon, Shield, Smartphone, Sun, Volume2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { useTheme } from '@/context/ThemeContext';
import {
  getNotificationSoundStyle,
  isNotificationSoundEnabled,
  playNotificationSound,
  setNotificationSoundEnabled,
  setNotificationSoundStyle,
  triggerHaptic,
} from '@/lib/sound';
import type { NotificationSoundStyle } from '@/types/api';

const SOUND_STYLES: { id: NotificationSoundStyle; label: string }[] = [
  { id: 'chime', label: 'Pastel Chime (Default)' },
  { id: 'ding', label: 'Gentle Bell' },
  { id: 'pop', label: 'Playful Pop' },
  { id: 'subtle', label: 'Subtle Note' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, isDark, mode, setMode } = useTheme();

  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [selectedSoundStyle, setSelectedSoundStyle] = useState<NotificationSoundStyle>('chime');

  useEffect(() => {
    isNotificationSoundEnabled().then(setSoundEnabledState);
    getNotificationSoundStyle().then(setSelectedSoundStyle);
  }, []);

  const handleToggleSound = async (val: boolean) => {
    await triggerHaptic('light');
    setSoundEnabledState(val);
    await setNotificationSoundEnabled(val);
  };

  const handleSelectSoundStyle = async (s: NotificationSoundStyle) => {
    await triggerHaptic('medium');
    setSelectedSoundStyle(s);
    await setNotificationSoundStyle(s);
    await playNotificationSound(s, true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header showBack title="App Settings" subtitle="Preferences & Appearance" />

      <ScrollView
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
      >
        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontSize: typography.xs }]}>
          APPEARANCE & THEME
        </Text>
        <Card style={[styles.card, { marginBottom: spacing.lg }]}>
          <View style={styles.themeOptionsRow}>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                setMode('light');
              }}
              style={[
                styles.themeBtn,
                {
                  borderColor: mode === 'light' ? colors.primary : colors.border,
                  backgroundColor: mode === 'light' ? colors.primary + '15' : colors.card,
                },
              ]}
            >
              <Sun size={20} color={mode === 'light' ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.themeBtnText, { color: colors.foreground, fontSize: typography.xs + 1 }]}>
                Light
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                setMode('dark');
              }}
              style={[
                styles.themeBtn,
                {
                  borderColor: mode === 'dark' ? colors.primary : colors.border,
                  backgroundColor: mode === 'dark' ? colors.primary + '15' : colors.card,
                },
              ]}
            >
              <Moon size={20} color={mode === 'dark' ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.themeBtnText, { color: colors.foreground, fontSize: typography.xs + 1 }]}>
                Dark
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                setMode('system');
              }}
              style={[
                styles.themeBtn,
                {
                  borderColor: mode === 'system' ? colors.primary : colors.border,
                  backgroundColor: mode === 'system' ? colors.primary + '15' : colors.card,
                },
              ]}
            >
              <Smartphone size={20} color={mode === 'system' ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.themeBtnText, { color: colors.foreground, fontSize: typography.xs + 1 }]}>
                System
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Audio & Haptics Section */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontSize: typography.xs }]}>
          AUDIO & SOUND CHIMES
        </Text>
        <Card style={[styles.card, { marginBottom: spacing.lg }]}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.foreground, fontSize: typography.base }]}>
                Notification Sounds
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                Play chimes on assignments and approvals
              </Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={handleToggleSound}
              trackColor={{ false: colors.muted, true: colors.primary }}
            />
          </View>

          {soundEnabled && (
            <View style={{ marginTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.md }}>
              <Text style={{ fontWeight: '600', color: colors.foreground, fontSize: typography.sm, marginBottom: 8 }}>
                Sound Chime Style
              </Text>
              {SOUND_STYLES.map((s) => {
                const isSelected = selectedSoundStyle === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => handleSelectSoundStyle(s.id)}
                    style={[
                      styles.soundOptionRow,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primary + '12' : colors.card,
                      },
                    ]}
                  >
                    <Volume2 size={16} color={isSelected ? colors.primary : colors.mutedForeground} />
                    <Text style={{ color: colors.foreground, fontSize: typography.sm, marginLeft: 8, flex: 1, fontWeight: isSelected ? '700' : '500' }}>
                      {s.label}
                    </Text>
                    {isSelected && <Text style={{ color: colors.primary, fontSize: typography.xs, fontWeight: '700' }}>PLAY</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 4,
  },
  card: {
    padding: 16,
  },
  themeOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  themeBtnText: {
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontWeight: '600',
  },
  soundOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 11,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
});
