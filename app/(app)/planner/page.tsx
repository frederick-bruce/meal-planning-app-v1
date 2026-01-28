"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Sparkles, X, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { Meal, WeekPlan } from "@/lib/types"
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
  saveWeekPlan, // Declare saveWeekPlan here
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

  const weekStartStr = formatDate(currentWeekStart)

  const loadData = useCallback(async () => {
    const loadedMeals = await getMeals()
    setMeals(loadedMeals)
    const plan = await getWeekPlan(weekStartStr)
    setWeekPlan(plan)
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
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Weekly Planner
          </h1>
          <p className="text-muted-foreground mt-1">
            Plan your meals for the week ahead
          </p>
        </div>
        <div className="flex items-center gap-2">
          {swapMode && (
            <Button variant="outline" size="sm" onClick={cancelSwap}>
              <X className="w-4 h-4 mr-1" />
              Cancel Swap
            </Button>
          )}
          <Button onClick={handleGeneratePlan}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Plan
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-card rounded-lg border border-border p-4 mb-6">
        <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
          <ChevronLeft className="w-5 h-5" />
          <span className="sr-only">Previous week</span>
        </Button>
        <div className="text-center">
          <p className="font-medium text-foreground">{formatDateRange()}</p>
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

      {/* Week Grid */}
      {weekPlan ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
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
    </div>
  )
}
