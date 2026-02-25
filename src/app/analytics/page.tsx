"use client"

import { IconLock, IconChartBar } from "@tabler/icons-react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function AnalyticsPage() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Card className="max-w-md w-full">
                  <CardContent className="flex flex-col items-center justify-center text-center py-12 px-8">
                    <div className="flex size-20 items-center justify-center rounded-full bg-muted mb-6">
                      <IconChartBar className="size-10 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <IconLock className="size-5 text-muted-foreground" />
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">Analytics</h2>
                    <p className="text-muted-foreground">
                      Advanced portfolio analytics, performance metrics, and goal tracking are coming soon. 
                      Stay tuned for powerful insights into your investments.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
