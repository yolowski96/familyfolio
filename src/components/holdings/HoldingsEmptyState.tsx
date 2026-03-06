'use client';

import { IconCurrencyEuro } from '@tabler/icons-react';
import { Card, CardContent } from '@/components/ui/card';

interface HoldingsEmptyStateProps {
  hasFilters: boolean;
}

export function HoldingsEmptyState({ hasFilters }: HoldingsEmptyStateProps) {
  return (
    <Card className="py-12">
      <CardContent className="flex flex-col items-center justify-center text-center">
        <IconCurrencyEuro className="size-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No holdings found</h3>
        <p className="text-muted-foreground text-sm">
          {hasFilters
            ? 'Try adjusting your filters'
            : 'Add a transaction to get started'}
        </p>
      </CardContent>
    </Card>
  );
}
