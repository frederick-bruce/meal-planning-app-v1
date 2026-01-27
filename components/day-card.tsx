"use client"

import { RefreshCw, ArrowLeftRight, UtensilsCrossed } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Meal, DayPlan } from "@/lib/types"

interface DayCardProps {
  day: DayPlan
  meals: Meal[]
  isSwapMode: boolean
  isSwapSelected: boolean
  onReroll: () => void
  onSwapSelect: () => void
  onMealChange: (mealId: string | null) => void
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function DayCard({
  day,
  meals,
  isSwapMode,
  isSwapSelected,
  onReroll,
  onSwapSelect,
  onMealChange,
}: DayCardProps) {
  const date = new Date(day.date)
  const dayName = DAY_NAMES[date.getDay()]
  const dayNumber = date.getDate()
  const meal = meals.find((m) => m.id === day.mealId)

  return (
    <Card
      className={cn(
        "transition-all",
        isSwapMode && "cursor-pointer hover:border-primary",
        isSwapSelected && "ring-2 ring-primary border-primary"
      )}
      onClick={isSwapMode ? onSwapSelect : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {dayName}
            </span>
            <span className="text-lg font-semibold text-foreground">
              {dayNumber}
            </span>
          </div>
          {!isSwapMode && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation()
                  onReroll()
                }}
                title="Reroll meal"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation()
                  onSwapSelect()
                }}
                title="Swap with another day"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        {meal ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                <UtensilsCrossed className="w-4 h-4 text-primary" />
              </div>
              <span className="font-medium text-foreground truncate">
                {meal.name}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {meal.cookTimeMinutes} min
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <span className="text-sm">Off / Leftovers</span>
          </div>
        )}

        {!isSwapMode && (
          <div className="mt-3 pt-3 border-t border-border">
            <Select
              value={day.mealId ?? "off"}
              onValueChange={(value) =>
                onMealChange(value === "off" ? null : value)
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Choose meal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off / Leftovers</SelectItem>
                {meals.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
