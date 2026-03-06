"use client"

import { useCallback, useRef } from "react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { usePortfolioStore } from "@/store/usePortfolioStore"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IconChevronDown, IconUsers, IconWallet } from "@tabler/icons-react"
import { ThemeToggle } from "@/components/layout/ThemeToggle"

export function SiteHeader() {
  const persons = usePortfolioStore((state) => state.persons)
  const activePersonId = usePortfolioStore((state) => state.activePersonId)
  const setActivePerson = usePortfolioStore((state) => state.setActivePerson)
  const loadPersons = usePortfolioStore((state) => state.loadPersons)
  const personsLoaded = useRef(false)

  const handleDropdownOpen = useCallback((open: boolean) => {
    if (open && !personsLoaded.current && persons.length === 0) {
      personsLoaded.current = true
      loadPersons().catch(console.error)
    }
  }, [loadPersons, persons.length])

  const getDisplayValue = () => {
    if (activePersonId === 'ALL') return 'Family View (All)'
    const person = persons.find((p) => p.id === activePersonId)
    return person?.name || 'Select Person'
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6 overflow-hidden">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator
          orientation="vertical"
          className="mx-2 hidden sm:block data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium hidden sm:block">Dashboard</h1>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <DropdownMenu onOpenChange={handleDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-9 w-[160px] sm:w-[180px] justify-between gap-2 border bg-transparent px-3 shadow-xs"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                  {activePersonId === 'ALL' ? (
                    <IconUsers className="h-4 w-4 shrink-0 text-cyan-500" />
                  ) : (
                    <IconWallet className="h-4 w-4 shrink-0 text-emerald-500" />
                  )}
                  <span className="truncate text-left">{getDisplayValue()}</span>
                </div>
                <IconChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="bottom"
              sideOffset={4}
              className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[160px] sm:min-w-[180px]"
            >
              <DropdownMenuItem onClick={() => setActivePerson('ALL')}>
                <IconUsers className="h-4 w-4 text-cyan-500" />
                <span>Family View (All)</span>
              </DropdownMenuItem>
              {persons.map((person) => (
                <DropdownMenuItem
                  key={person.id}
                  onClick={() => setActivePerson(person.id)}
                >
                  <div
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: person.color }}
                  />
                  <span>{person.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
