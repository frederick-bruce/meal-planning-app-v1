"use client"

import { useState, useEffect } from "react"
import { Plus, UtensilsCrossed, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import type { Meal } from "@/lib/types"
import { getMeals, addMeal, updateMeal, deleteMeal, seedSampleMeals } from "@/lib/db"
import { MealForm } from "@/components/meal-form"
import { MealCard } from "@/components/meal-card"

export default function MealsPage() {
  const { toast } = useToast()
  const [meals, setMeals] = useState<Meal[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMeal, setEditingMeal] = useState<Meal | undefined>()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)

  const loadMeals = async () => {
    const loaded = await getMeals()
    setMeals(loaded)
    setIsLoaded(true)
  }

  useEffect(() => {
    loadMeals()
  }, [])

  const handleAddMeal = () => {
    setEditingMeal(undefined)
    setIsDialogOpen(true)
  }

  const handleEditMeal = (meal: Meal) => {
    setEditingMeal(meal)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (mealData: Omit<Meal, "id"> & { id?: string }) => {
    if (mealData.id) {
      await updateMeal(mealData as Meal)
      toast({ title: "Meal updated successfully" })
    } else {
      await addMeal({
        name: mealData.name,
        tags: mealData.tags,
        cookTimeMinutes: mealData.cookTimeMinutes,
        ingredients: mealData.ingredients,
      })
      toast({ title: "Meal added successfully" })
    }
    await loadMeals()
    setIsDialogOpen(false)
    setEditingMeal(undefined)
  }

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId) {
      await deleteMeal(deleteConfirmId)
      await loadMeals()
      toast({ title: "Meal deleted" })
      setDeleteConfirmId(null)
    }
  }

  const handleSeedMeals = async () => {
    setIsSeeding(true)
    const count = await seedSampleMeals()
    await loadMeals()
    setIsSeeding(false)
    toast({
      title: `Added ${count} sample meals!`,
      description: "Your meal library is ready to go.",
    })
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Meals Library</h1>
          <p className="text-muted-foreground mt-1">
            Add and manage your meal collection
          </p>
        </div>
        <Button onClick={handleAddMeal}>
          <Plus className="w-4 h-4 mr-2" />
          Add Meal
        </Button>
      </div>

      {meals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-border rounded-lg bg-muted/30">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <UtensilsCrossed className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">No meals yet</h3>
          <p className="text-muted-foreground text-center max-w-sm mb-4">
            Start building your meal library by adding your favorite recipes, or load sample meals to get started quickly.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleAddMeal}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Meal
            </Button>
            <Button variant="outline" onClick={handleSeedMeals} disabled={isSeeding}>
              <Sparkles className="w-4 h-4 mr-2" />
              {isSeeding ? "Adding..." : "Load Sample Meals"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onEdit={handleEditMeal}
              onDelete={setDeleteConfirmId}
            />
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMeal ? "Edit Meal" : "Add New Meal"}
            </DialogTitle>
          </DialogHeader>
          <MealForm
            meal={editingMeal}
            onSubmit={handleSubmit}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this meal? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
