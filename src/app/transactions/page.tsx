"use client"

import { TransactionsView } from "@/components/transactions/TransactionsView"
import { AppShell } from "@/components/shared/AppShell"

export default function TransactionsPage() {
  return (
    <AppShell>
      <TransactionsView />
    </AppShell>
  )
}
