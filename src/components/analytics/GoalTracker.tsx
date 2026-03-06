"use client"

import * as React from "react"
import {
  IconCheck,
  IconChevronRight,
  IconCoin,
  IconPlus,
  IconTarget,
  IconTrash,
  IconTrophy,
} from "@tabler/icons-react"
import { format, differenceInDays, isPast } from "date-fns"

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
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { formatCurrencyCompact, formatQuantity } from "@/lib/utils"
import { usePortfolioStore } from "@/store/usePortfolioStore"
import { usePortfolioWithPrices } from "@/hooks/usePortfolioWithPrices"
import { Goal, GoalType, AssetType } from "@/types"

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  PORTFOLIO_VALUE: 'Portfolio Value',
  MONTHLY_INVESTMENT: 'Monthly Investment',
  ASSET_TARGET: 'Asset Target',
  DIVERSIFICATION: 'Diversification',
}

const GOAL_TYPE_ICONS: Record<GoalType, React.ReactNode> = {
  PORTFOLIO_VALUE: <IconCoin className="size-5" />,
  MONTHLY_INVESTMENT: <IconChevronRight className="size-5" />,
  ASSET_TARGET: <IconTarget className="size-5" />,
  DIVERSIFICATION: <IconChevronRight className="size-5" />,
}

interface GoalCardProps {
  goal: Goal
  currentValue: number
  onDelete: () => void
  onComplete: () => void
}

function GoalCard({ goal, currentValue, onDelete, onComplete }: GoalCardProps) {
  const progress = Math.min((currentValue / goal.targetValue) * 100, 100)
  const isCompleted = progress >= 100 || goal.isCompleted
  const daysLeft = goal.deadline ? differenceInDays(new Date(goal.deadline), new Date()) : null
  const isOverdue = goal.deadline ? isPast(new Date(goal.deadline)) && !isCompleted : false

  const getProgressColor = () => {
    if (isCompleted) return 'bg-emerald-500'
    if (isOverdue) return 'bg-rose-500'
    if (progress >= 75) return 'bg-emerald-500'
    if (progress >= 50) return 'bg-amber-500'
    return 'bg-cyan-500'
  }

  const formatValue = () => {
    if (goal.type === 'ASSET_TARGET') {
      return `${formatQuantity(currentValue)} / ${formatQuantity(goal.targetValue)} ${goal.assetSymbol}`
    }
    if (goal.type === 'DIVERSIFICATION') {
      return `${currentValue.toFixed(1)}% / ${goal.targetValue}%`
    }
    return `${formatCurrencyCompact(currentValue)} / ${formatCurrencyCompact(goal.targetValue)}`
  }

  return (
    <Card className={`transition-all ${isCompleted ? 'border-emerald-500/30 bg-emerald-500/5' : isOverdue ? 'border-rose-500/30 bg-rose-500/5' : ''}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`flex size-10 items-center justify-center rounded-lg ${isCompleted ? 'bg-emerald-500/20 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
              {isCompleted ? <IconTrophy className="size-5" /> : GOAL_TYPE_ICONS[goal.type]}
            </div>
            <div>
              <h3 className="font-semibold">{goal.name}</h3>
              <p className="text-muted-foreground text-sm">{GOAL_TYPE_LABELS[goal.type]}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isCompleted && !goal.isCompleted && (
              <Button variant="ghost" size="icon" className="size-8 text-emerald-500" onClick={onComplete}>
                <IconCheck className="size-4" />
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-rose-500">
                  <IconTrash className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Goal</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{goal.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-rose-600 hover:bg-rose-500">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress.toFixed(1)}%</span>
          </div>
          
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${getProgressColor()}`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{formatValue()}</span>
            {goal.deadline && (
              <Badge variant={isOverdue ? "destructive" : isCompleted ? "default" : "secondary"}>
                {isCompleted 
                  ? 'Completed!' 
                  : isOverdue 
                    ? 'Overdue' 
                    : daysLeft === 0 
                      ? 'Due today'
                      : `${daysLeft} days left`
                }
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function GoalTracker() {
  const goals = usePortfolioStore((state) => state.goals)
  const persons = usePortfolioStore((state) => state.persons)
  const addGoalAction = usePortfolioStore((state) => state.addGoal)
  const updateGoal = usePortfolioStore((state) => state.updateGoal)
  const deleteGoal = usePortfolioStore((state) => state.deleteGoal)
  const { summary } = usePortfolioWithPrices()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  
  // Form state
  const [goalName, setGoalName] = React.useState('')
  const [goalType, setGoalType] = React.useState<GoalType>('PORTFOLIO_VALUE')
  const [targetValue, setTargetValue] = React.useState('')
  const [deadline, setDeadline] = React.useState('')
  const [personId, setPersonId] = React.useState<string>('ALL')
  const [assetSymbol, setAssetSymbol] = React.useState('')
  const [assetType, setAssetType] = React.useState<AssetType>('CRYPTO')

  // Calculate current values for each goal
  const goalsWithProgress = React.useMemo(() => {
    return goals.map(goal => {
      let currentValue = Number(goal.currentValue) || 0

      switch (goal.type) {
        case 'PORTFOLIO_VALUE':
          if (goal.personId) {
            // Calculate for specific person
            const personHoldings = summary.holdings // This already respects activePersonId
            currentValue = personHoldings.reduce((sum, h) => sum + h.totalValue, 0)
          } else {
            currentValue = summary.totalBalance
          }
          break
        
        case 'ASSET_TARGET':
          const holding = summary.holdings.find(h => h.symbol === goal.assetSymbol)
          currentValue = holding?.totalQuantity || 0
          break
        
        case 'DIVERSIFICATION':
          const typeAllocation = summary.allocationByType.find(a => a.type === goal.assetType)
          currentValue = typeAllocation?.percent || 0
          break
        
        default:
          currentValue = 0
      }

      return { ...goal, currentValue, targetValue: Number(goal.targetValue) }
    })
  }, [goals, summary])

  const completedGoals = goalsWithProgress.filter(g => g.isCompleted || (g.currentValue / g.targetValue) >= 1)
  const activeGoals = goalsWithProgress.filter(g => !g.isCompleted && (g.currentValue / g.targetValue) < 1)

  const resetForm = () => {
    setGoalName('')
    setGoalType('PORTFOLIO_VALUE')
    setTargetValue('')
    setDeadline('')
    setPersonId('ALL')
    setAssetSymbol('')
    setAssetType('CRYPTO')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!goalName || !targetValue) return

    await addGoalAction({
      name: goalName,
      type: goalType,
      targetValue: parseFloat(targetValue),
      deadline: deadline ? deadline : undefined,
      personId: personId && personId !== 'ALL' ? personId : undefined,
      assetSymbol: goalType === 'ASSET_TARGET' ? assetSymbol.toUpperCase() : undefined,
      assetType: goalType === 'DIVERSIFICATION' ? assetType : undefined,
    })

    resetForm()
    setDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Financial Goals</h2>
          <p className="text-muted-foreground text-sm">
            Track your progress towards your investment goals
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <IconPlus className="size-4" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>
                Set a financial target to track your progress.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="goalName">Goal Name</Label>
                  <Input
                    id="goalName"
                    placeholder="e.g., Reach $100K Portfolio"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="goalType">Goal Type</Label>
                  <Select value={goalType} onValueChange={(v) => setGoalType(v as GoalType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PORTFOLIO_VALUE">Portfolio Value Target</SelectItem>
                      <SelectItem value="ASSET_TARGET">Asset Quantity Target</SelectItem>
                      <SelectItem value="DIVERSIFICATION">Allocation Target</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {goalType === 'PORTFOLIO_VALUE' && (
                  <div className="grid gap-2">
                    <Label htmlFor="person">Person (Optional)</Label>
                    <Select value={personId} onValueChange={setPersonId}>
                      <SelectTrigger>
                        <SelectValue placeholder="All persons" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Persons</SelectItem>
                        {persons.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {goalType === 'ASSET_TARGET' && (
                  <div className="grid gap-2">
                    <Label htmlFor="assetSymbol">Asset Symbol</Label>
                    <Input
                      id="assetSymbol"
                      placeholder="e.g., BTC, ETH, AAPL"
                      value={assetSymbol}
                      onChange={(e) => setAssetSymbol(e.target.value)}
                      className="uppercase"
                    />
                  </div>
                )}

                {goalType === 'DIVERSIFICATION' && (
                  <div className="grid gap-2">
                    <Label htmlFor="assetType">Asset Type</Label>
                    <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CRYPTO">Crypto</SelectItem>
                        <SelectItem value="STOCK">Stocks</SelectItem>
                        <SelectItem value="ETF">ETFs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="targetValue">
                    Target {goalType === 'DIVERSIFICATION' ? '(%)' : goalType === 'ASSET_TARGET' ? '(Quantity)' : '(EUR)'}
                  </Label>
                  <Input
                    id="targetValue"
                    type="number"
                    step="any"
                    min="0"
                    placeholder={goalType === 'DIVERSIFICATION' ? '30' : goalType === 'ASSET_TARGET' ? '1' : '100000'}
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="deadline">Deadline (Optional)</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!goalName || !targetValue}>
                  Create Goal
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex size-12 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
              <IconTarget className="size-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Active Goals</p>
              <p className="text-2xl font-semibold">{activeGoals.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex size-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <IconTrophy className="size-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Completed</p>
              <p className="text-2xl font-semibold">{completedGoals.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex size-12 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
              <IconChevronRight className="size-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Avg. Progress</p>
              <p className="text-2xl font-semibold">
                {goalsWithProgress.length > 0
                  ? (goalsWithProgress.reduce((sum, g) => sum + Math.min((g.currentValue / g.targetValue) * 100, 100), 0) / goalsWithProgress.length).toFixed(0)
                  : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Active Goals</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                currentValue={goal.currentValue}
                onDelete={() => deleteGoal(goal.id)}
                onComplete={() => updateGoal(goal.id, { isCompleted: true })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-emerald-500">Completed Goals 🎉</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {completedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                currentValue={goal.currentValue}
                onDelete={() => deleteGoal(goal.id)}
                onComplete={() => updateGoal(goal.id, { isCompleted: true })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {goals.length === 0 && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <IconTarget className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No goals yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create your first financial goal to start tracking progress
            </p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <IconPlus className="size-4" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

