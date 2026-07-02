"use client"

import * as React from "react"
import {
  IconEdit,
  IconPlus,
  IconStar,
  IconStarFilled,
  IconTrash,
  IconUser,
  IconAlertTriangle,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  usePersons,
  useTransactions,
  useAddPerson,
  useUpdatePerson,
  useDeletePerson,
  useSetDefaultPerson,
} from "@/lib/queries"

// Default colors for new persons
const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
]

export function SettingsView() {
  const { data: persons = [] } = usePersons()
  const { data: transactions = [] } = useTransactions()
  const { mutateAsync: addPerson } = useAddPerson()
  const { mutateAsync: updatePerson } = useUpdatePerson()
  const { mutateAsync: setDefaultPerson } = useSetDefaultPerson()
  const { mutateAsync: deletePerson } = useDeletePerson()
  
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [newPersonName, setNewPersonName] = React.useState('')
  const [newPersonColor, setNewPersonColor] = React.useState(DEFAULT_COLORS[0])
  const [editingPerson, setEditingPerson] = React.useState<{
    id: string
    name: string
    color: string
    apiKeyPrefix: string | null
  } | null>(null)
  const [apiKeyInput, setApiKeyInput] = React.useState('')
  const [removeApiKey, setRemoveApiKey] = React.useState(false)
  const [editError, setEditError] = React.useState<string | null>(null)

  const trimmedApiKey = apiKeyInput.trim()
  const apiKeyTooShort = trimmedApiKey.length > 0 && trimmedApiKey.length < 16

  // Calculate person stats
  const personStats = React.useMemo(() => {
    return persons.map(person => {
      const personTransactions = transactions.filter(t => t.personId === person.id)
      const uniqueAssets = new Set(personTransactions.map(t => t.assetSymbol)).size
      const totalTransactions = personTransactions.length
      
      return {
        ...person,
        transactionCount: totalTransactions,
        assetCount: uniqueAssets,
      }
    })
  }, [persons, transactions])

  const handleCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPersonName.trim()) return

    await addPerson({ name: newPersonName.trim(), color: newPersonColor })
    setNewPersonName('')
    setNewPersonColor(DEFAULT_COLORS[persons.length % DEFAULT_COLORS.length])
    setCreateDialogOpen(false)
  }

  const handleEditPerson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPerson || !editingPerson.name.trim() || apiKeyTooShort) return

    const updates: { name: string; color: string; apiKey?: string | null } = {
      name: editingPerson.name.trim(),
      color: editingPerson.color,
    }
    if (removeApiKey) {
      updates.apiKey = null
    } else if (trimmedApiKey) {
      updates.apiKey = trimmedApiKey
    }

    try {
      await updatePerson({ id: editingPerson.id, updates })
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Failed to update person')
      return
    }
    setEditingPerson(null)
    setEditDialogOpen(false)
  }

  const openEditDialog = (person: {
    id: string
    name: string
    color: string
    apiKeyPrefix: string | null
  }) => {
    setEditingPerson({
      id: person.id,
      name: person.name,
      color: person.color,
      apiKeyPrefix: person.apiKeyPrefix,
    })
    setApiKeyInput('')
    setRemoveApiKey(false)
    setEditError(null)
    setEditDialogOpen(true)
  }

  const handleDeletePerson = async (personId: string) => {
    await deletePerson(personId)
  }

  const handleSetDefault = async (personId: string) => {
    await setDefaultPerson(personId)
  }

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage family members and application preferences
        </p>
      </div>

      {/* Person Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconUser className="size-5" />
                Family Members
              </CardTitle>
              <CardDescription>
                Create and manage family member portfolios
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <IconPlus className="size-4" />
                  Add Person
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Family Member</DialogTitle>
                  <DialogDescription>
                    Add a new family member to track their investments separately.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreatePerson}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="personName">Name</Label>
                      <Input
                        id="personName"
                        placeholder="e.g., John, Sarah, Kids Fund"
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Color</Label>
                      <div className="flex gap-2 flex-wrap">
                        {DEFAULT_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`size-8 rounded-full border-2 transition-all ${
                              newPersonColor === color 
                                ? 'border-foreground scale-110' 
                                : 'border-transparent hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setNewPersonColor(color)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={!newPersonName.trim()}>
                      Add Person
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {personStats.length > 0 ? (
            <div className="space-y-3">
              {personStats.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="flex size-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: person.color }}
                    >
                      <span className="text-white font-semibold text-sm">
                        {person.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{person.name}</p>
                        {person.isDefault && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <IconStarFilled className="size-3" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {person.assetCount} assets • {person.transactionCount} transactions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className={`text-muted-foreground ${person.isDefault ? 'text-amber-500' : 'hover:text-amber-500'}`}
                            onClick={() => handleSetDefault(person.id)}
                            disabled={person.isDefault}
                          >
                            {person.isDefault ? (
                              <IconStarFilled className="size-4" />
                            ) : (
                              <IconStar className="size-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {person.isDefault ? 'Default person' : 'Set as default'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => openEditDialog(person)}
                          >
                            <IconEdit className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <AlertDialog>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-muted-foreground hover:text-rose-500"
                              >
                                <IconTrash className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <IconAlertTriangle className="size-5 text-rose-500" />
                            Delete Person
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete <strong>&ldquo;{person.name}&rdquo;</strong>? 
                            This will also delete all {person.transactionCount} transactions 
                            and holdings associated with this person. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeletePerson(person.id)}
                            className="bg-rose-600 hover:bg-rose-500"
                          >
                            Delete Person
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <IconUser className="size-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No family members yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Add your first family member to start tracking investments
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <IconPlus className="size-4" />
                Add Person
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Person Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Person</DialogTitle>
            <DialogDescription>
              Update the name and color for this family member.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditPerson}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="editPersonName">Name</Label>
                <Input
                  id="editPersonName"
                  placeholder="e.g., John, Sarah, Kids Fund"
                  value={editingPerson?.name || ''}
                  onChange={(e) => setEditingPerson(prev => prev ? { ...prev, name: e.target.value } : null)}
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`size-8 rounded-full border-2 transition-all ${
                        editingPerson?.color === color
                          ? 'border-foreground scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditingPerson(prev => prev ? { ...prev, color } : null)}
                    />
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="editPersonApiKey">API Key</Label>
                  {editingPerson?.apiKeyPrefix && (
                    <button
                      type="button"
                      className={`text-xs ${
                        removeApiKey
                          ? 'text-muted-foreground hover:text-foreground'
                          : 'text-rose-500 hover:text-rose-400'
                      }`}
                      onClick={() => {
                        setRemoveApiKey((prev) => !prev)
                        setApiKeyInput('')
                      }}
                    >
                      {removeApiKey ? 'Keep current key' : 'Remove key'}
                    </button>
                  )}
                </div>
                <Input
                  id="editPersonApiKey"
                  type="password"
                  autoComplete="off"
                  placeholder={
                    removeApiKey
                      ? 'Key will be removed on save'
                      : editingPerson?.apiKeyPrefix
                        ? `Current: ${editingPerson.apiKeyPrefix} — paste new key to replace`
                        : 'Paste API key from external app'
                  }
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  disabled={removeApiKey}
                />
                {apiKeyTooShort ? (
                  <p className="text-rose-500 text-xs">
                    API key must be at least 16 characters
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Grants read-only access to this person&apos;s positions via{' '}
                    <code>GET /api/v1/positions</code>
                  </p>
                )}
              </div>
              {editError && <p className="text-rose-500 text-sm">{editError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!editingPerson?.name.trim() || apiKeyTooShort}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle>About FamilyFolio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Version</span>
            <Badge variant="secondary">0.1.0</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Data Storage</span>
            <span className="text-sm">PostgreSQL (Supabase)</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Price Data</span>
            <span className="text-sm">Yahoo Finance & CoinGecko</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
