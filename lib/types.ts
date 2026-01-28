export interface Ingredient {
  name: string
  quantity?: string
}

export interface Meal {
  id: string
  user_id?: string
  name: string
  tags: string[]
  cookTimeMinutes: number
  ingredients: Ingredient[]
  created_at?: string
}

export interface Settings {
  user_id?: string
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
  id?: string
  user_id?: string
  weekStart: string
  days: DayPlan[]
  created_at?: string
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
