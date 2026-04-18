'use client';

import * as React from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';

const SIDEBAR_STYLE: React.CSSProperties = {
  // Tokens read by `@/components/ui/sidebar`. Kept as constants so we only
  // define the shell once for every app page.
  ['--sidebar-width' as keyof React.CSSProperties]: 'calc(var(--spacing) * 72)',
  ['--header-height' as keyof React.CSSProperties]: 'calc(var(--spacing) * 12)',
} as React.CSSProperties;

interface AppShellProps {
  children: React.ReactNode;
  /**
   * When `true` (the default) the inner container applies the standard page
   * vertical rhythm used across all dashboards. Opt out on pages that need to
   * manage their own spacing.
   */
  padded?: boolean;
}

/**
 * Shared sidebar + header + content shell used by every authenticated page.
 */
export function AppShell({ children, padded = true }: AppShellProps) {
  return (
    <SidebarProvider style={SIDEBAR_STYLE}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {padded ? (
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                {children}
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
