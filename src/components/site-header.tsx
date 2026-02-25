"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { usePortfolioStore } from "@/store/usePortfolioStore"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IconUsers, IconWallet } from "@tabler/icons-react"
import { ThemeToggle } from "@/components/layout/ThemeToggle"

export function SiteHeader() {
  const persons = usePortfolioStore((state) => state.persons)
  const activePersonId = usePortfolioStore((state) => state.activePersonId)
  const setActivePerson = usePortfolioStore((state) => state.setActivePerson)

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
          <Select value={activePersonId} onValueChange={setActivePerson}>
            <SelectTrigger className="w-[160px] sm:w-[180px]">
              <div className="flex items-center gap-2 overflow-hidden">
                {activePersonId === 'ALL' ? (
                  <IconUsers className="h-4 w-4 shrink-0 text-cyan-500" />
                ) : (
                  <IconWallet className="h-4 w-4 shrink-0 text-emerald-500" />
                )}
                <span className="truncate">
                  <SelectValue placeholder="Select person">{getDisplayValue()}</SelectValue>
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">
                <div className="flex items-center gap-2">
                  <IconUsers className="h-4 w-4 text-cyan-500" />
                  <span>Family View (All)</span>
                </div>
              </SelectItem>
              {persons.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full shrink-0" 
                      style={{ backgroundColor: person.color }}
                    />
                    <span>{person.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
