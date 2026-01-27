export interface Ingredient {
  name: string
  quantity?: string
}

export interface Meal {
  id: string
  name: string
  tags: string[]
  cookTimeMinutes: number
  ingredients: Ingredient[]
}

export interface Settings {
  dinnersPerWeek: number
  maxCookTimeMinutes: number
  excludedIngredients: string[]
  allowRepeats: boolean
}

export interface DayPlan {
  date: string
  mealId: string | null
}

export interface WeekPlan {
  weekStart: string
  days: DayPlan[]
}

export interface ShoppingItem {
  name: string
  checked: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  dinnersPerWeek: 5,
  maxCookTimeMinutes: 45,
  excludedIngredients: [],
  allowRepeats: false,
}
