"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Sparkles, X, Calendar, MessageSquare, Check, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { Meal, WeekPlan, Household, MealRequest } from "@/lib/types"
import {
  getMeals,
  getWeekPlan,
  generatePlan,
  rerollDay,
  swapDays,
  setDayMeal,
  getWeekStart,
  formatDate,
  getWeekDays,
  getUserHousehold,
  getMealRequests,
  createMealRequest,
  updateMealRequestStatus,
  deleteMealRequest,
} from "@/lib/db"
import { DayCard } from "@/components/day-card"

export default function PlannerPage() {
  const { toast } = useToast()
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    getWeekStart(new Date())
  )
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const [swapMode, setSwapMode] = useState(false)
  const [swapFirstDay, setSwapFirstDay] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Household state
  const [household, setHousehold] = useState<Household | null>(null)
  const [mealRequests, setMealRequests] = useState<MealRequest[]>([])
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const [selectedMealId, setSelectedMealId] = useState<string>("")
  const [requestNote, setRequestNote] = useState("")

  const weekStartStr = formatDate(currentWeekStart)

  const loadData = useCallback(async () => {
    const loadedMeals = await getMeals()
    setMeals(loadedMeals)
    const plan = await getWeekPlan(weekStartStr)
    setWeekPlan(plan)
    
    // Load household and requests
    const h = await getUserHousehold()
    setHousehold(h)
    if (h) {
      const requests = await getMealRequests(h.id, weekStartStr)
      setMealRequests(requests)
    }
    
    setIsLoaded(true)
  }, [weekStartStr])

  useEffect(() => {
    loadData()
  }, [loadData])

  const goToPreviousWeek = () => {
    const prev = new Date(currentWeekStart)
    prev.setDate(prev.getDate() - 7)
    setCurrentWeekStart(prev)
    setSwapMode(false)
    setSwapFirstDay(null)
  }

  const goToNextWeek = () => {
    const next = new Date(currentWeekStart)
    next.setDate(next.getDate() + 7)
    setCurrentWeekStart(next)
    setSwapMode(false)
    setSwapFirstDay(null)
  }

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getWeekStart(new Date()))
    setSwapMode(false)
    setSwapFirstDay(null)
  }

  const handleGeneratePlan = async () => {
    if (meals.length === 0) {
      toast({
        title: "Add some meals first!",
        description: "Go to the Meals page to add meals to your library.",
        variant: "destructive",
      })
      return
    }

    const newPlan = await generatePlan(weekStartStr)
    setWeekPlan(newPlan)
    toast({
      title: "Plan generated!",
      description: "Your weekly meal plan has been created.",
    })
  }

  const handleReroll = async (dayDate: string) => {
    if (meals.length === 0) return
    const updatedPlan = await rerollDay(weekStartStr, dayDate)
    if (updatedPlan) {
      setWeekPlan(updatedPlan)
      toast({ title: "Meal rerolled!" })
    }
  }

  const handleSwapSelect = async (dayDate: string) => {
    if (!swapMode) {
      setSwapMode(true)
      setSwapFirstDay(dayDate)
      toast({ title: "Select another day to swap with" })
    } else if (swapFirstDay && swapFirstDay !== dayDate) {
      const updatedPlan = await swapDays(weekStartStr, swapFirstDay, dayDate)
      if (updatedPlan) {
        setWeekPlan(updatedPlan)
        toast({ title: "Days swapped!" })
      }
      setSwapMode(false)
      setSwapFirstDay(null)
    }
  }

  const handleMealChange = async (dayDate: string, mealId: string | null) => {
    const updatedPlan = await setDayMeal(weekStartStr, dayDate, mealId)
    if (updatedPlan) {
      setWeekPlan(updatedPlan)
    }
  }

  const cancelSwap = () => {
    setSwapMode(false)
    setSwapFirstDay(null)
  }

  // Meal request handlers
  const handleCreateRequest = async () => {
    if (!household || !selectedMealId) return
    await createMealRequest(household.id, selectedMealId, weekStartStr, requestNote || undefined)
    const requests = await getMealRequests(household.id, weekStartStr)
    setMealRequests(requests)
    setShowRequestDialog(false)
    setSelectedMealId("")
    setRequestNote("")
    toast({ title: "Meal requested!" })
  }

  const handleApproveRequest = async (request: MealRequest) => {
    // Find a day without a meal and assign this one
    if (weekPlan) {
      const emptyDay = weekPlan.days.find(d => !d.mealId)
      if (emptyDay) {
        await setDayMeal(weekStartStr, emptyDay.date, request.meal_id)
        const updatedPlan = await getWeekPlan(weekStartStr)
        setWeekPlan(updatedPlan)
      }
    }
    await updateMealRequestStatus(request.id, "planned")
    if (household) {
      const requests = await getMealRequests(household.id, weekStartStr)
      setMealRequests(requests)
    }
    toast({ title: "Request approved and added to plan!" })
  }

  const handleDismissRequest = async (requestId: string) => {
    await updateMealRequestStatus(requestId, "dismissed")
    if (household) {
      const requests = await getMealRequests(household.id, weekStartStr)
      setMealRequests(requests)
    }
    toast({ title: "Request dismissed" })
  }

  const handleDeleteRequest = async (requestId: string) => {
    await deleteMealRequest(requestId)
    if (household) {
      const requests = await getMealRequests(household.id, weekStartStr)
      setMealRequests(requests)
    }
  }

  const pendingRequests = mealRequests.filter(r => r.status === "pending")

  const weekDays = getWeekDays(currentWeekStart)
  const weekEndDate = weekDays[6]

  const formatDateRange = () => {
    const startMonth = currentWeekStart.toLocaleDateString("en-US", {
      month: "short",
    })
    const endMonth = weekEndDate.toLocaleDateString("en-US", { month: "short" })
    const startDay = currentWeekStart.getDate()
    const endDay = weekEndDate.getDate()
    const year = currentWeekStart.getFullYear()

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}, ${year}`
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Weekly Planner
          </h1>
          <p className="text-muted-foreground mt-1">
            Plan your meals for the week ahead
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {swapMode && (
            <Button variant="outline" size="sm" onClick={cancelSwap} className="w-full sm:w-auto">
              <X className="w-4 h-4 mr-1" />
              Cancel Swap
            </Button>
          )}
          <Button onClick={handleGeneratePlan} className="w-full sm:w-auto">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Plan
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 bg-card rounded-lg border border-border p-3 sm:p-4 mb-6">
        <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
          <ChevronLeft className="w-5 h-5" />
          <span className="sr-only">Previous week</span>
        </Button>
        <div className="text-center px-2 min-w-0">
          <p className="font-medium text-foreground truncate">{formatDateRange()}</p>
          <Button
            variant="link"
            size="sm"
            className="text-muted-foreground h-auto p-0"
            onClick={goToCurrentWeek}
          >
            Go to current week
          </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={goToNextWeek}>
          <ChevronRight className="w-5 h-5" />
          <span className="sr-only">Next week</span>
        </Button>
      </div>

      {swapMode && (
        <div className="bg-accent/50 border border-accent rounded-lg p-3 mb-6 text-center">
          <p className="text-sm text-accent-foreground">
            <strong>Swap Mode:</strong> Select another day to swap meals
          </p>
        </div>
      )}

      {/* Meal Requests Section (if in a household) */}
      {household && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Meal Requests
                {pendingRequests.length > 0 && (
                  <Badge variant="secondary">{pendingRequests.length}</Badge>
                )}
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRequestDialog(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-1" />
                Request Meal
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pendingRequests.length > 0 ? (
              <div className="space-y-2">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {request.meal?.name || "Unknown meal"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Requested by {request.requester?.display_name || "Someone"}
                        {request.note && ` - "${request.note}"`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-primary hover:text-primary"
                        onClick={() => handleApproveRequest(request)}
                        title="Add to plan"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDismissRequest(request.id)}
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No pending requests. Household members can request meals they'd like this week.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Week Grid */}
      {weekPlan ? (
        <>
          {/* Mobile: horizontal scroller */}
          <div className="md:hidden -mx-4 px-4 overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-max">
              {weekPlan.days.map((day) => (
                <DayCard
                  key={day.date}
                  day={day}
                  meals={meals}
                  isSwapMode={swapMode}
                  isSwapSelected={swapFirstDay === day.date}
                  onReroll={() => handleReroll(day.date)}
                  onSwapSelect={() => handleSwapSelect(day.date)}
                  onMealChange={(mealId) => handleMealChange(day.date, mealId)}
                  className="w-64 shrink-0"
                />
              ))}
            </div>
          </div>

          {/* Desktop/tablet: grid */}
          <div className="hidden md:grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {weekPlan.days.map((day) => (
              <DayCard
                key={day.date}
                day={day}
                meals={meals}
                isSwapMode={swapMode}
                isSwapSelected={swapFirstDay === day.date}
                onReroll={() => handleReroll(day.date)}
                onSwapSelect={() => handleSwapSelect(day.date)}
                onMealChange={(mealId) => handleMealChange(day.date, mealId)}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-border rounded-lg bg-muted/30">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            No plan for this week
          </h3>
          <p className="text-muted-foreground text-center max-w-sm mb-4">
            {meals.length === 0
              ? "Add some meals to your library first, then generate a plan."
              : "Click 'Generate Plan' to create a meal plan for this week based on your preferences."}
          </p>
          <Button onClick={handleGeneratePlan} disabled={meals.length === 0}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Plan
          </Button>
        </div>
      )}

      {/* Request Meal Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a Meal</DialogTitle>
            <DialogDescription>
              Request a meal for this week. The meal planner can approve or dismiss requests.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mealSelect">Select Meal</Label>
              <Select value={selectedMealId} onValueChange={setSelectedMealId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a meal..." />
                </SelectTrigger>
                <SelectContent>
                  {meals.map((meal) => (
                    <SelectItem key={meal.id} value={meal.id}>
                      {meal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestNote">Note (optional)</Label>
              <Input
                id="requestNote"
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="e.g., It's been a while since we had this!"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRequest} disabled={!selectedMealId}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
