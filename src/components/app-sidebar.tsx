"use client"

import * as React from "react"
import {
  IconChartBar,
  IconCoin,
  IconHistory,
  IconLayoutDashboard,
  IconSettings,
  IconWallet,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navMain = [
    {
      title: "Dashboard",
      url: "/",
      icon: IconLayoutDashboard,
    },
    {
      title: "Holdings",
      url: "/holdings",
      icon: IconWallet,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: IconChartBar,
    },
    {
      title: "Transactions",
      url: "/transactions",
      icon: IconHistory,
    },
  ]

  const navSecondary = [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
    },
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/">
                <IconCoin className="!size-5 text-emerald-500" />
                <span className="text-base font-semibold">FamilyFolio</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
