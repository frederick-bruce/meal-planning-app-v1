"use client"

import { useState, useEffect } from "react"
import { Plus, UtensilsCrossed, Sparkles, Link, Search, Filter, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import type { Meal, Ingredient, Nutrition } from "@/lib/types"
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
  
  // Import state
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importUrl, setImportUrl] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [importedRecipe, setImportedRecipe] = useState<{
    name: string
    cookTimeMinutes: number
    ingredients: Ingredient[]
    instructions: string[]
    imageUrl: string | null
    servings: number | null
    nutrition: Nutrition | null
    tags: string[]
  } | null>(null)
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  
  // Get all unique tags from meals
  const allTags = [...new Set(meals.flatMap((m) => m.tags))].sort()
  
  // Filter meals based on search and tags
  const filteredMeals = meals.filter((meal) => {
    const matchesSearch = searchQuery === "" || 
      meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meal.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesTags = selectedTags.length === 0 ||
      selectedTags.some((tag) => meal.tags.includes(tag))
    
    return matchesSearch && matchesTags
  })

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
      const ok = await updateMeal(mealData as Meal)
      if (ok) {
        toast({ title: "Meal updated successfully" })
      } else {
        toast({
          title: "Update failed",
          description: "Could not update this meal. Check console logs for details.",
          variant: "destructive",
        })
        return
      }
    } else {
      const created = await addMeal({
        name: mealData.name,
        tags: mealData.tags,
        cookTimeMinutes: mealData.cookTimeMinutes,
        ingredients: mealData.ingredients,
        instructions: mealData.instructions,
        imageUrl: mealData.imageUrl,
        servings: mealData.servings,
        nutrition: mealData.nutrition,
      })
      if (created) {
        toast({ title: "Meal added successfully" })
      } else {
        toast({
          title: "Add failed",
          description: "Could not save this meal. Check console logs for details.",
          variant: "destructive",
        })
        return
      }
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

  const handleImportRecipe = async () => {
    if (!importUrl.trim()) return
    
    setIsImporting(true)
    try {
      const response = await fetch("/api/parse-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        toast({
          title: "Import failed",
          description: data.error || "Could not parse recipe from this URL",
          variant: "destructive",
        })
        return
      }
      
      setImportedRecipe({
        name: data.name,
        cookTimeMinutes: data.cookTimeMinutes,
        ingredients: data.ingredients,
        instructions: Array.isArray(data.instructions) ? data.instructions : [],
        imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : null,
        servings: typeof data.servings === "number" ? data.servings : null,
        nutrition: data.nutrition && typeof data.nutrition === "object" ? data.nutrition : null,
        tags: data.tags,
      })
      
      toast({
        title: "Recipe parsed!",
        description: "Review the details and save to your library.",
      })
    } catch {
      toast({
        title: "Import failed",
        description: "Could not connect to the recipe parser",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleSaveImportedRecipe = async () => {
    if (!importedRecipe) return

    const created = await addMeal({
      name: importedRecipe.name,
      tags: importedRecipe.tags,
      cookTimeMinutes: importedRecipe.cookTimeMinutes,
      ingredients: importedRecipe.ingredients,
      instructions: importedRecipe.instructions,
      imageUrl: importedRecipe.imageUrl ?? undefined,
      servings: importedRecipe.servings ?? undefined,
      nutrition: importedRecipe.nutrition ?? undefined,
    })

    if (!created) {
      toast({
        title: "Save failed",
        description: "Could not save this imported recipe. Check console logs for details.",
        variant: "destructive",
      })
      return
    }

    await loadMeals()
    setShowImportDialog(false)
    setImportUrl("")
    setImportedRecipe(null)
    toast({ title: "Recipe imported successfully!" })
  }

  const resetImportDialog = () => {
    setShowImportDialog(false)
    setImportUrl("")
    setImportedRecipe(null)
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
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Meals Library</h1>
            <p className="text-muted-foreground mt-1">
              {meals.length} meal{meals.length !== 1 ? "s" : ""} in your collection
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
              <Link className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button onClick={handleAddMeal}>
              <Plus className="w-4 h-4 mr-2" />
              Add Meal
            </Button>
          </div>
        </div>
        
        {/* Search and Filter Bar */}
        {meals.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search meals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {allTags.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <Filter className="w-4 h-4" />
                    Filter
                    {selectedTags.length > 0 && (
                      <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                        {selectedTags.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Filter by tag</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {allTags.map((tag) => (
                    <DropdownMenuCheckboxItem
                      key={tag}
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTags([...selectedTags, tag])
                        } else {
                          setSelectedTags(selectedTags.filter((t) => t !== tag))
                        }
                      }}
                    >
                      {tag}
                    </DropdownMenuCheckboxItem>
                  ))}
                  {selectedTags.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground"
                        onClick={() => setSelectedTags([])}
                      >
                        Clear filters
                      </Button>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
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
      ) : filteredMeals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-border rounded-lg bg-muted/30">
          <Search className="w-10 h-10 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium text-foreground mb-1">No meals found</h3>
          <p className="text-muted-foreground text-center">
            Try adjusting your search or filters
          </p>
          {(searchQuery || selectedTags.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => {
                setSearchQuery("")
                setSelectedTags([])
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMeals.map((meal) => (
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

      {/* Import Recipe Dialog */}
      <Dialog open={showImportDialog} onOpenChange={resetImportDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-hidden p-0">
          <div className="flex max-h-[90vh] flex-col">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle>Import Recipe from URL</DialogTitle>
              <DialogDescription>
                Paste a link to a recipe and we'll automatically extract the details.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {!importedRecipe ? (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipeUrl">Recipe URL</Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        id="recipeUrl"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        placeholder="https://example.com/recipe..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !isImporting) {
                            handleImportRecipe()
                          }
                        }}
                      />
                      <Button
                        onClick={handleImportRecipe}
                        disabled={isImporting || !importUrl.trim()}
                        className="sm:w-auto w-full"
                      >
                        {isImporting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Parse"
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Works best with recipe sites like AllRecipes, Food Network, Tasty, BBC Good Food, and others that use structured recipe data.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    {importedRecipe.imageUrl && (
                      <div className="overflow-hidden rounded-lg border border-border bg-card">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={importedRecipe.imageUrl}
                          alt={importedRecipe.name}
                          className="w-full aspect-video object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-muted-foreground">Recipe Name</Label>
                      <p className="font-medium text-foreground wrap-break-word">{importedRecipe.name}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:items-center">
                      <div>
                        <Label className="text-xs text-muted-foreground">Cook Time</Label>
                        <p className="flex items-center gap-1 text-sm text-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {importedRecipe.cookTimeMinutes} min
                        </p>
                      </div>

                      {typeof importedRecipe.servings === "number" && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Servings</Label>
                          <p className="text-sm text-foreground">{importedRecipe.servings}</p>
                        </div>
                      )}

                      {importedRecipe.tags.length > 0 && (
                        <div className="col-span-2 sm:col-auto min-w-0">
                          <Label className="text-xs text-muted-foreground">Tags</Label>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {importedRecipe.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {importedRecipe.nutrition && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Nutrition (per serving)</Label>
                        <div className="mt-1 flex flex-wrap gap-2 text-sm text-foreground">
                          {typeof importedRecipe.nutrition.calories === "number" && (
                            <Badge variant="secondary">{importedRecipe.nutrition.calories} cal</Badge>
                          )}
                          {typeof importedRecipe.nutrition.proteinG === "number" && (
                            <Badge variant="secondary">{importedRecipe.nutrition.proteinG}g protein</Badge>
                          )}
                          {typeof importedRecipe.nutrition.carbsG === "number" && (
                            <Badge variant="secondary">{importedRecipe.nutrition.carbsG}g carbs</Badge>
                          )}
                          {typeof importedRecipe.nutrition.fatG === "number" && (
                            <Badge variant="secondary">{importedRecipe.nutrition.fatG}g fat</Badge>
                          )}
                          {typeof importedRecipe.nutrition.fiberG === "number" && (
                            <Badge variant="secondary">{importedRecipe.nutrition.fiberG}g fiber</Badge>
                          )}
                          {typeof importedRecipe.nutrition.sugarG === "number" && (
                            <Badge variant="secondary">{importedRecipe.nutrition.sugarG}g sugar</Badge>
                          )}
                          {typeof importedRecipe.nutrition.sodiumMg === "number" && (
                            <Badge variant="secondary">{importedRecipe.nutrition.sodiumMg}mg sodium</Badge>
                          )}
                          {typeof importedRecipe.nutrition.cholesterolMg === "number" && (
                            <Badge variant="secondary">{importedRecipe.nutrition.cholesterolMg}mg cholesterol</Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Ingredients ({importedRecipe.ingredients.length})
                      </Label>
                      <ul className="mt-1 text-sm text-foreground space-y-0.5">
                        {importedRecipe.ingredients.slice(0, 12).map((ing, i) => (
                          <li key={i} className="wrap-break-word">
                            {ing.quantity && <span className="text-muted-foreground">{ing.quantity} </span>}
                            {ing.name}
                          </li>
                        ))}
                        {importedRecipe.ingredients.length > 12 && (
                          <li className="text-muted-foreground">
                            +{importedRecipe.ingredients.length - 12} more...
                          </li>
                        )}
                      </ul>
                    </div>

                    {importedRecipe.instructions.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Instructions ({importedRecipe.instructions.length})
                        </Label>
                        <ol className="mt-1 text-sm text-foreground space-y-1 list-decimal list-inside">
                          {importedRecipe.instructions.slice(0, 8).map((step, i) => (
                            <li key={i} className="text-sm wrap-break-word">
                              {step}
                            </li>
                          ))}
                          {importedRecipe.instructions.length > 8 && (
                            <li className="text-muted-foreground">
                              +{importedRecipe.instructions.length - 8} more...
                            </li>
                          )}
                        </ol>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                    <Button variant="outline" onClick={() => setImportedRecipe(null)} className="w-full sm:w-auto">
                      Try Another URL
                    </Button>
                    <Button onClick={handleSaveImportedRecipe} className="w-full sm:w-auto">
                      Save to Library
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
