// mobile/app/(tabs)/territories/create.tsx
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLocation } from '@/hooks/useLocation';
import { useCongregationTerritories, useCreateTerritory } from '@/hooks/useTerritories';
import { findDuplicateTerritory, getNextCongregationTerritoryNumber } from '@/lib/territories';
import { triggerHaptic } from '@/lib/sound';

export default function CreateTerritoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeCongregationId } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const { territories = [] } = useCongregationTerritories(activeCongregationId || '');
  const { create, isCreating } = useCreateTerritory(activeCongregationId || '');
  const { location } = useLocation(true);

  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!number && territories.length > 0) {
      setNumber(getNextCongregationTerritoryNumber(territories));
    }
  }, [territories, number]);

  const handleCreate = async () => {
    if (!number.trim()) {
      setErrorMessage('Please enter a territory number (e.g. 101, 12-A)');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Please enter a territory name or locality description');
      return;
    }

    const duplicate = findDuplicateTerritory(number, territories);
    if (duplicate) {
      setErrorMessage(`Territory #${duplicate.number} already exists in this congregation.`);
      triggerHaptic('error');
      return;
    }

    setErrorMessage(null);
    try {
      await create({
        number: number.trim(),
        name: name.trim(),
        city: city.trim() || null,
        notes: notes.trim() || null,
        boundaryCoordinates: location
          ? [
              { lat: location.latitude - 0.002, lng: location.longitude - 0.002 },
              { lat: location.latitude - 0.002, lng: location.longitude + 0.002 },
              { lat: location.latitude + 0.002, lng: location.longitude + 0.002 },
              { lat: location.latitude + 0.002, lng: location.longitude - 0.002 },
            ]
          : null,
      });
      await triggerHaptic('success');
      router.back();
    } catch (err: any) {
      triggerHaptic('error');
      setErrorMessage(err.message || 'Failed to create territory');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Header showBack title="New Territory" subtitle="Create territory in congregation" />

      <ScrollView
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          {errorMessage && (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: `${colors.destructive}15`, marginBottom: spacing.md },
              ]}
            >
              <Text
                style={[styles.errorText, { color: colors.destructive, fontSize: typography.sm }]}
              >
                {errorMessage}
              </Text>
            </View>
          )}

          <Input
            label="Territory Number *"
            placeholder="e.g. 104, 12-B"
            value={number}
            onChangeText={setNumber}
          />

          <Input
            label="Territory Name / Area *"
            placeholder="e.g. Downtown Commercial, West Hills"
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <Input
            label="City / Locality"
            placeholder="e.g. Springfield"
            value={city}
            onChangeText={setCity}
          />

          <Input
            label="Notes / Boundaries Description"
            placeholder="e.g. North of Main St, East of 5th Ave. Includes apartments."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            style={{ minHeight: 90 }}
          />

          <Button
            title="Create Territory"
            onPress={handleCreate}
            loading={isCreating}
            size="lg"
            style={{ marginTop: spacing.md }}
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
    padding: 18,
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontWeight: '600',
  },
});
