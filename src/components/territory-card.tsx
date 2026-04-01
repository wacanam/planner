'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Eye, Pencil, Trash2, RotateCcw, ClipboardList } from 'lucide-react';
import Link from 'next/link';

export type TerritoryCardData = {
  id: string;
  number: string;
  name: string;
  status: string;
  householdsCount: number;
  coveragePercent: number;
};

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-800 border-green-200',
  assigned: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-purple-100 text-purple-800 border-purple-200',
  archived: 'bg-gray-100 text-gray-600 border-gray-200',
};

type Props = {
  territory: TerritoryCardData;
  onDelete?: (id: string) => void;
  showActions?: boolean;
};

export function TerritoryCard({ territory, onDelete, showActions = true }: Props) {
  return (
    <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-gray-500 font-medium">#{territory.number}</p>
            <CardTitle className="text-base">{territory.name}</CardTitle>
          </div>
          <Badge
            className={`text-xs border ${statusColors[territory.status] ?? 'bg-gray-100 text-gray-600'}`}
            variant="outline"
          >
            {territory.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {territory.householdsCount} households
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {territory.coveragePercent}% coverage
          </span>
        </div>

        {/* Coverage bar */}
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-blue-400 h-1.5 rounded-full transition-all"
            style={{ width: `${Math.min(100, territory.coveragePercent)}%` }}
          />
        </div>

        {showActions && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
              <Link href={`/territories/${territory.id}`}>
                <Eye className="h-3 w-3 mr-1" />
                View
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
              <Link href={`/territories/${territory.id}?edit=true`}>
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
              <Link href={`/territories/${territory.id}/assignments`}>
                <ClipboardList className="h-3 w-3 mr-1" />
                Assign
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
              <Link href={`/territories/${territory.id}/rotation`}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Rotate
              </Link>
            </Button>
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-red-600 hover:bg-red-50 border-red-200"
                onClick={() => onDelete(territory.id)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
