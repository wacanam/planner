'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'default';
  loading?: boolean;
}

const colorMap = {
  blue: {
    card: 'border-blue-100 dark:border-blue-900/40',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-500',
    value: 'text-blue-700 dark:text-blue-400',
    label: 'text-blue-600 dark:text-blue-500',
  },
  green: {
    card: 'border-green-100 dark:border-green-900/40',
    bg: 'bg-green-50 dark:bg-green-900/20',
    icon: 'text-green-500',
    value: 'text-green-700 dark:text-green-400',
    label: 'text-green-600 dark:text-green-500',
  },
  purple: {
    card: 'border-purple-100 dark:border-purple-900/40',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    icon: 'text-purple-500',
    value: 'text-purple-700 dark:text-purple-400',
    label: 'text-purple-600 dark:text-purple-500',
  },
  orange: {
    card: 'border-orange-100 dark:border-orange-900/40',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    icon: 'text-orange-500',
    value: 'text-orange-700 dark:text-orange-400',
    label: 'text-orange-600 dark:text-orange-500',
  },
  red: {
    card: 'border-red-100 dark:border-red-900/40',
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-500',
    value: 'text-red-700 dark:text-red-400',
    label: 'text-red-600 dark:text-red-500',
  },
  default: {
    card: 'border-border',
    bg: 'bg-muted/30',
    icon: 'text-muted-foreground',
    value: 'text-foreground',
    label: 'text-muted-foreground',
  },
};

export function StatCard({ title, value, subtitle, icon: Icon, color = 'default', loading }: StatCardProps) {
  const colors = colorMap[color];

  if (loading) {
    return (
      <Card className={cn('border', colors.card)}>
        <CardContent className="p-4">
          <div className="h-4 w-20 bg-muted animate-pulse rounded mb-2" />
          <div className="h-8 w-16 bg-muted animate-pulse rounded mb-1" />
          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border', colors.card)}>
      <CardContent className={cn('p-4', colors.bg, 'rounded-2xl')}>
        <div className="flex items-start justify-between">
          <div>
            <p className={cn('text-xs font-medium uppercase tracking-wide', colors.label)}>{title}</p>
            <p className={cn('text-2xl font-bold mt-1', colors.value)}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {Icon && (
            <div className={cn('p-2 rounded-xl bg-white/60 dark:bg-black/20', colors.icon)}>
              <Icon size={18} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
