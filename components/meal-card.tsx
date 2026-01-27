"use client"

import { Clock, Pencil, Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Meal } from "@/lib/types"

interface MealCardProps {
  meal: Meal
  onEdit: (meal: Meal) => void
  onDelete: (mealId: string) => void
}

export function MealCard({ meal, onEdit, onDelete }: MealCardProps) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">{meal.name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{meal.cookTimeMinutes} min</span>
            </div>
            {meal.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {meal.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {meal.ingredients.length} ingredient{meal.ingredients.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(meal)}
              className="h-8 w-8"
            >
              <Pencil className="w-4 h-4" />
              <span className="sr-only">Edit {meal.name}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(meal.id)}
              className="h-8 w-8 hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              <span className="sr-only">Delete {meal.name}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
