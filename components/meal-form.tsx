"use client"

import React from "react"

import { useState } from "react"
import { z } from "zod"
import { X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Meal, Ingredient } from "@/lib/types"

const mealSchema = z.object({
  name: z.string().min(1, "Name is required"),
  tags: z.array(z.string()),
  cookTimeMinutes: z.number().min(1, "Cook time must be at least 1 minute"),
  ingredients: z.array(
    z.object({
      name: z.string().min(1, "Ingredient name is required"),
      quantity: z.string().optional(),
    })
  ).min(1, "At least one ingredient is required"),
})

interface MealFormProps {
  meal?: Meal
  onSubmit: (meal: Omit<Meal, "id"> & { id?: string }) => void
  onCancel: () => void
}

export function MealForm({ meal, onSubmit, onCancel }: MealFormProps) {
  const [name, setName] = useState(meal?.name ?? "")
  const [tags, setTags] = useState<string[]>(meal?.tags ?? [])
  const [tagInput, setTagInput] = useState("")
  const [cookTimeMinutes, setCookTimeMinutes] = useState(meal?.cookTimeMinutes ?? 30)
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    meal?.ingredients ?? [{ name: "", quantity: "" }]
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const addIngredient = () => {
    setIngredients([...ingredients, { name: "", quantity: "" }])
  }

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const newIngredients = [...ingredients]
    newIngredients[index] = { ...newIngredients[index], [field]: value }
    setIngredients(newIngredients)
  }

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const filteredIngredients = ingredients.filter((ing) => ing.name.trim())

    const data = {
      name: name.trim(),
      tags,
      cookTimeMinutes,
      ingredients: filteredIngredients,
    }

    const result = mealSchema.safeParse(data)

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        const path = err.path.join(".")
        fieldErrors[path] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    onSubmit(meal ? { ...data, id: meal.id } : data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Meal Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Spaghetti Bolognese"
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cookTime">Cook Time (minutes) *</Label>
        <Input
          id="cookTime"
          type="number"
          min={1}
          value={cookTimeMinutes}
          onChange={(e) => setCookTimeMinutes(parseInt(e.target.value) || 0)}
          className={errors.cookTimeMinutes ? "border-destructive" : ""}
        />
        {errors.cookTimeMinutes && (
          <p className="text-sm text-destructive">{errors.cookTimeMinutes}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <div className="flex gap-2">
          <Input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addTag()
              }
            }}
            placeholder="e.g., Italian, Quick"
          />
          <Button type="button" variant="secondary" onClick={addTag}>
            Add
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Ingredients *</Label>
        <div className="space-y-3">
          {ingredients.map((ingredient, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex-1">
                <Input
                  value={ingredient.name}
                  onChange={(e) => updateIngredient(index, "name", e.target.value)}
                  placeholder="Ingredient name"
                />
              </div>
              <div className="w-32">
                <Input
                  value={ingredient.quantity ?? ""}
                  onChange={(e) => updateIngredient(index, "quantity", e.target.value)}
                  placeholder="Quantity"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeIngredient(index)}
                disabled={ingredients.length === 1}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
          <Plus className="w-4 h-4 mr-1" />
          Add Ingredient
        </Button>
        {errors.ingredients && (
          <p className="text-sm text-destructive">{errors.ingredients}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{meal ? "Update Meal" : "Add Meal"}</Button>
      </div>
    </form>
  )
}
