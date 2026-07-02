'use client';

import dynamic from 'next/dynamic';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePrivacy } from '@/components/providers/PrivacyProvider';
import { useAnalyticsData } from './useAnalyticsData';

const ChartsFallback = () => (
  <div className="h-64 w-full animate-pulse rounded bg-muted/50" />
);

const AnalyticsOverviewTab = dynamic(
  () => import('./AnalyticsOverviewTab').then((m) => m.AnalyticsOverviewTab),
  { ssr: false, loading: ChartsFallback },
);

const AnalyticsPerformanceTab = dynamic(
  () =>
    import('./AnalyticsPerformanceTab').then((m) => m.AnalyticsPerformanceTab),
  { ssr: false, loading: ChartsFallback },
);

export function AnalyticsView() {
  usePrivacy();
  const {
    summary,
    performanceData,
    allocationData,
    holdingsPLData,
    monthlyVolume,
    viewName,
  } = useAnalyticsData();

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Performance insights for {viewName}
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AnalyticsOverviewTab
            summary={summary}
            performanceData={performanceData}
            allocationData={allocationData}
            monthlyVolume={monthlyVolume}
          />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <AnalyticsPerformanceTab
            summary={summary}
            holdingsPLData={holdingsPLData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
