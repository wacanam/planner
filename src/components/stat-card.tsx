import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
  loading?: boolean;
}

const colorStyles: Record<string, { bg: string; text: string }> = {
  blue: {
    bg: 'bg-primary/10 text-primary',
    text: 'text-primary',
  },
  green: {
    bg: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400',
    text: 'text-green-700 dark:text-green-400',
  },
  purple: {
    bg: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400',
    text: 'text-purple-700 dark:text-purple-400',
  },
  orange: {
    bg: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400',
    text: 'text-orange-700 dark:text-orange-400',
  },
  red: {
    bg: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
    text: 'text-red-700 dark:text-red-400',
  },
  gray: {
    bg: 'bg-muted text-muted-foreground',
    text: 'text-muted-foreground',
  },
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color = 'blue',
  loading = false,
}: StatCardProps) {
  const currentStyle = colorStyles[color] ?? colorStyles.blue;

  return (
    <Card className="bg-card border-border shadow-xs hover:border-border/80 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          {Icon && (
            <div className={`p-2 rounded-xl ${currentStyle.bg}`}>
              <Icon size={16} />
            </div>
          )}
        </div>
        <div className="mt-2">
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{value}</p>
          )}
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
