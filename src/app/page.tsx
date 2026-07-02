'use client';

import dynamic from 'next/dynamic';

import { DataTable } from '@/components/data-table';
import { SectionCards } from '@/components/section-cards';
import { AppShell } from '@/components/shared/AppShell';
import { Card, CardContent } from '@/components/ui/card';

const ChartAreaInteractive = dynamic(
  () =>
    import('@/components/chart-area-interactive').then(
      (m) => m.ChartAreaInteractive,
    ),
  {
    ssr: false,
    loading: () => (
      <Card className="@container/card">
        <CardContent className="flex h-[330px] items-center justify-center p-6">
          <div className="h-full w-full animate-pulse rounded bg-muted/50" />
        </CardContent>
      </Card>
    ),
  },
);

export default function Page() {
  return (
    <AppShell>
      <SectionCards />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      <DataTable />
    </AppShell>
  );
}
