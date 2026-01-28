"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Clock, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Meal } from "@/lib/types"
import { getMeal } from "@/lib/db"

function normalizeMealId(param: string | string[] | undefined): string | null {
  if (!param) return null
  return Array.isArray(param) ? (param[0] ?? null) : param
}

export default function MealDetailPage() {
  const params = useParams<{ id?: string | string[] }>()
  const mealId = useMemo(() => normalizeMealId(params?.id), [params])

  const [meal, setMeal] = useState<Meal | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!mealId) {
        if (!cancelled) {
          setMeal(null)
          setIsLoaded(true)
        }
        return
      }

      const data = await getMeal(mealId)
      if (!cancelled) {
        setMeal(data)
        setIsLoaded(true)
      }
    }

    setIsLoaded(false)
    load()

    return () => {
      cancelled = true
    }
  }, [mealId])

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading recipe...
        </div>
      </div>
    )
  }

  if (!meal) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Button variant="ghost" asChild className="gap-2">
          <Link href="/meals">
            <ArrowLeft className="w-4 h-4" />
            Back to meals
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Meal not found</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            This meal may have been deleted, or you may not have access to it.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" asChild className="gap-2">
          <Link href="/meals">
            <ArrowLeft className="w-4 h-4" />
            Back to meals
          </Link>
        </Button>
      </div>

      <Card>
        {meal.imageUrl && (
          <div className="overflow-hidden rounded-t-xl border-b border-border bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meal.imageUrl}
              alt={meal.name}
              className="w-full h-56 object-cover"
              loading="lazy"
            />
          </div>
        )}
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">{meal.name}</CardTitle>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {meal.cookTimeMinutes} min
            </span>
            {typeof meal.servings === "number" && <span>{meal.servings} servings</span>}
            <span>{meal.ingredients.length} ingredient{meal.ingredients.length !== 1 ? "s" : ""}</span>
          </div>
          {meal.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {meal.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {meal.nutrition && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Nutrition (per serving)</h2>
              <div className="flex flex-wrap gap-2 text-sm text-foreground">
                {typeof meal.nutrition.calories === "number" && (
                  <Badge variant="secondary">{meal.nutrition.calories} cal</Badge>
                )}
                {typeof meal.nutrition.proteinG === "number" && (
                  <Badge variant="secondary">{meal.nutrition.proteinG}g protein</Badge>
                )}
                {typeof meal.nutrition.carbsG === "number" && (
                  <Badge variant="secondary">{meal.nutrition.carbsG}g carbs</Badge>
                )}
                {typeof meal.nutrition.fatG === "number" && (
                  <Badge variant="secondary">{meal.nutrition.fatG}g fat</Badge>
                )}
                {typeof meal.nutrition.saturatedFatG === "number" && (
                  <Badge variant="secondary">{meal.nutrition.saturatedFatG}g sat fat</Badge>
                )}
                {typeof meal.nutrition.transFatG === "number" && (
                  <Badge variant="secondary">{meal.nutrition.transFatG}g trans fat</Badge>
                )}
                {typeof meal.nutrition.fiberG === "number" && (
                  <Badge variant="secondary">{meal.nutrition.fiberG}g fiber</Badge>
                )}
                {typeof meal.nutrition.sugarG === "number" && (
                  <Badge variant="secondary">{meal.nutrition.sugarG}g sugar</Badge>
                )}
                {typeof meal.nutrition.sodiumMg === "number" && (
                  <Badge variant="secondary">{meal.nutrition.sodiumMg}mg sodium</Badge>
                )}
                {typeof meal.nutrition.cholesterolMg === "number" && (
                  <Badge variant="secondary">{meal.nutrition.cholesterolMg}mg cholesterol</Badge>
                )}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Ingredients</h2>
            <ul className="space-y-2">
              {meal.ingredients.map((ing, idx) => (
                <li
                  key={`${ing.name}-${idx}`}
                  className="flex items-start justify-between gap-4 border-b border-border/60 pb-2"
                >
                  <span className="text-foreground">
                    {ing.quantity ? (
                      <span className="text-muted-foreground">{ing.quantity} </span>
                    ) : null}
                    {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {meal.instructions && meal.instructions.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Instructions</h2>
              <ol className="space-y-2 list-decimal list-inside">
                {meal.instructions.map((step, idx) => (
                  <li key={idx} className="text-foreground">
                    {step}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
