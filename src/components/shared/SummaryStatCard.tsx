'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SummaryStatCardProps {
  label: string;
  /** Main value, pre-formatted (e.g. a currency string or a count). */
  value: React.ReactNode;
  /** Optional secondary line underneath the value. */
  caption?: React.ReactNode;
  /** Icon element rendered in the tinted box. */
  icon: React.ReactNode;
  /** Tailwind classes for the icon container (background + text color). */
  iconClassName?: string;
  /** Optional color class applied to the value itself. */
  valueClassName?: string;
}

/**
 * Uniform card used across summary stat grids (holdings, transactions,
 * analytics) so we don't reinvent the same 40-line stat markup.
 */
export function SummaryStatCard({
  label,
  value,
  caption,
  icon,
  iconClassName,
  valueClassName,
}: SummaryStatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-0">
        <div
          className={cn(
            'flex size-12 items-center justify-center rounded-lg',
            iconClassName
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className={cn('text-xl font-semibold', valueClassName)}>{value}</p>
          {caption ? (
            <p className="text-muted-foreground text-xs">{caption}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
