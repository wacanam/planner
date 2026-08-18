// mobile/app/(tabs)/more/profile.tsx
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { AlertTriangle, Check, LogOut, Mail, Shield, User as UserIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { FIRESTORE_COLLECTIONS, getPlannerFirestore, nowIso } from '@/lib/firebase';
import { triggerHaptic } from '@/lib/sound';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const handleUpdateName = async () => {
    if (!name.trim() || !user?.id) return;
    setIsUpdating(true);
    try {
      const firestore = getPlannerFirestore();
      await updateDoc(doc(firestore, FIRESTORE_COLLECTIONS.users, user.id), {
        name: name.trim(),
        updatedAt: nowIso(),
      });
      await triggerHaptic('success');
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2000);
    } catch {
      triggerHaptic('error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await triggerHaptic('medium');
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Header showBack title="My Profile" subtitle="Account details & role" />

      <ScrollView
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Card */}
        <Card style={styles.card}>
          <View style={styles.avatarSection}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarLetter}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <Text style={[styles.profileName, { color: colors.foreground, fontSize: typography.lg }]}>
              {user?.name || 'Publisher'}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: typography.xs, marginTop: 2 }}>
              {user?.email}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              <Badge label={user?.role || 'PUBLISHER'} variant="primary" />
              {user?.congregationRole && <Badge label={user.congregationRole} variant="secondary" />}
            </View>
          </View>

          {successMsg && (
            <View style={[styles.successBox, { backgroundColor: colors.success + '15' }]}>
              <Check size={16} color={colors.success} />
              <Text style={{ color: colors.success, fontSize: typography.xs, fontWeight: '600', marginLeft: 6 }}>
                Profile updated successfully!
              </Text>
            </View>
          )}

          <View style={{ marginTop: spacing.lg }}>
            <Input
              label="Full Name"
              value={name}
              onChangeText={setName}
              icon={<UserIcon size={18} color={colors.mutedForeground} />}
            />

            <Input
              label="Email Address"
              value={user?.email || ''}
              editable={false}
              icon={<Mail size={18} color={colors.mutedForeground} />}
              style={{ opacity: 0.65 }}
            />

            <Button
              title="Save Changes"
              onPress={handleUpdateName}
              loading={isUpdating}
              size="md"
              style={{ marginTop: spacing.xs }}
            />
          </View>
        </Card>

        {/* Sign Out Card */}
        <Card style={[styles.card, { marginTop: spacing.lg }]}>
          <Button
            title="Sign Out"
            variant="destructive"
            onPress={handleSignOut}
            size="lg"
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  profileName: {
    fontWeight: '800',
    marginTop: 10,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 14,
  },
});
