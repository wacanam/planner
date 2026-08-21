// mobile/app/(tabs)/more/notifications.tsx
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { Bell, Check, Clock, Sparkles } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Header } from '@/components/ui/Header';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { FIRESTORE_COLLECTIONS, getPlannerFirestore, nowIso } from '@/lib/firebase';
import { triggerHaptic } from '@/lib/sound';
import type { Notification } from '@/types/api';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    const firestore = getPlannerFirestore();
    const q = query(
      collection(firestore, FIRESTORE_COLLECTIONS.notifications),
      where('userId', '==', user.id)
    );

    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Notification)
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setNotifications(list);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      }
    );
  }, [user?.id]);

  const handleMarkAsRead = async (notifId: string) => {
    try {
      await triggerHaptic('light');
      const firestore = getPlannerFirestore();
      await updateDoc(doc(firestore, FIRESTORE_COLLECTIONS.notifications, notifId), {
        isRead: true,
        readAt: nowIso(),
      });
    } catch {}
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        showBack
        title="Notifications"
        subtitle={`Activity alerts (${notifications.filter((n) => !n.isRead).length} unread)`}
      />

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell size={44} color={colors.mutedForeground} />}
          title="No Notifications"
          description="You're all caught up! Ministry assignments and approval alerts will appear here."
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: insets.bottom + spacing.xxl,
          }}
          renderItem={({ item }) => (
            <Card
              onPress={() => !item.isRead && handleMarkAsRead(item.id)}
              style={[
                styles.notifCard,
                { marginBottom: spacing.sm },
                !item.isRead && { borderColor: colors.primary, borderWidth: 1.2 },
              ]}
            >
              <View style={styles.notifHeader}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: item.isRead ? colors.muted : colors.primary + '20' },
                  ]}
                >
                  <Bell size={16} color={item.isRead ? colors.mutedForeground : colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text
                    style={[
                      styles.notifTitle,
                      { color: colors.foreground, fontSize: typography.sm + 1 },
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{ color: colors.mutedForeground, fontSize: typography.xs, marginTop: 1 }}
                  >
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Just now'}
                  </Text>
                </View>

                {!item.isRead && (
                  <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                )}
              </View>

              <Text
                style={[
                  styles.notifBody,
                  { color: colors.foreground, fontSize: typography.xs + 1 },
                ]}
              >
                {item.body}
              </Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifCard: {
    padding: 14,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notifBody: {
    marginTop: 8,
    lineHeight: 18,
  },
});
