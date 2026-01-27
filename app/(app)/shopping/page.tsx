"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, ShoppingCart, ChevronLeft, ChevronRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { ShoppingItem } from "@/lib/types"
import {
  getWeekStart,
  formatDate,
  getWeekPlan,
  generateShoppingList,
  getShoppingList,
  saveShoppingList,
} from "@/lib/store"
import { cn } from "@/lib/utils"

export default function ShoppingPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    getWeekStart(new Date())
  )
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const { toast } = useToast()

  const weekStartStr = formatDate(currentWeekStart)

  const loadData = useCallback(() => {
    const savedItems = getShoppingList()
    if (savedItems.length > 0) {
      setItems(savedItems)
    } else {
      const plan = getWeekPlan(weekStartStr)
      if (plan) {
        const generated = generateShoppingList(weekStartStr)
        setItems(generated)
        saveShoppingList(generated)
      }
    }
  }, [weekStartStr])

  useEffect(() => {
    loadData()
    setIsLoaded(true)
  }, [loadData])

  const goToPreviousWeek = () => {
    const prev = new Date(currentWeekStart)
    prev.setDate(prev.getDate() - 7)
    setCurrentWeekStart(prev)
  }

  const goToNextWeek = () => {
    const next = new Date(currentWeekStart)
    next.setDate(next.getDate() + 7)
    setCurrentWeekStart(next)
  }

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getWeekStart(new Date()))
  }

  const handleRegenerate = () => {
    const plan = getWeekPlan(weekStartStr)
    if (!plan) {
      toast({
        title: "No plan for this week",
        description: "Generate a meal plan first in the Planner page.",
        variant: "destructive",
      })
      return
    }

    const generated = generateShoppingList(weekStartStr)
    setItems(generated)
    saveShoppingList(generated)
    toast({ title: "Shopping list regenerated!" })
  }

  const toggleItem = (index: number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], checked: !newItems[index].checked }
    setItems(newItems)
    saveShoppingList(newItems)
  }

  const weekDays = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(currentWeekStart)
    day.setDate(currentWeekStart.getDate() + i)
    weekDays.push(day)
  }
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

  const checkedCount = items.filter((item) => item.checked).length
  const totalCount = items.length

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Shopping List
          </h1>
          <p className="text-muted-foreground mt-1">
            Ingredients from your weekly plan
          </p>
        </div>
        <Button variant="outline" onClick={handleRegenerate}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Regenerate
        </Button>
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

      {items.length > 0 ? (
        <>
          {/* Progress */}
          <div className="flex items-center justify-between mb-4 text-sm">
            <span className="text-muted-foreground">
              {checkedCount} of {totalCount} items checked
            </span>
            {checkedCount === totalCount && totalCount > 0 && (
              <span className="flex items-center gap-1 text-primary font-medium">
                <Check className="w-4 h-4" />
                All done!
              </span>
            )}
          </div>

          {/* Shopping List */}
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {items.map((item, index) => (
                <label
                  key={item.name}
                  className={cn(
                    "flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                    item.checked && "bg-muted/30"
                  )}
                >
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={() => toggleItem(index)}
                  />
                  <span
                    className={cn(
                      "flex-1 text-foreground",
                      item.checked && "line-through text-muted-foreground"
                    )}
                  >
                    {item.name}
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-border rounded-lg bg-muted/30">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <ShoppingCart className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            No shopping list yet
          </h3>
          <p className="text-muted-foreground text-center max-w-sm mb-4">
            Generate a meal plan in the Planner page first, then your shopping
            list will appear here automatically.
          </p>
          <Button variant="outline" onClick={handleRegenerate}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Generate from Plan
          </Button>
        </div>
      )}
    </div>
  )
}
