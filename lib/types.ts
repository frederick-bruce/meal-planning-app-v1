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
  instructions?: string[]
  imageUrl?: string
  servings?: number
  nutrition?: Nutrition
  created_at?: string
}

export interface Nutrition {
  calories?: number
  proteinG?: number
  fatG?: number
  saturatedFatG?: number
  transFatG?: number
  carbsG?: number
  fiberG?: number
  sugarG?: number
  sodiumMg?: number
  cholesterolMg?: number
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

// Household types
export interface Household {
  id: string
  name: string
  invite_code: string
  created_by?: string
  owner_id?: string
  created_at?: string
}

export interface HouseholdMember {
  id: string
  household_id: string
  user_id: string
  display_name: string
  role: 'owner' | 'member'
  joined_at?: string
  created_at?: string
}

export interface MealRequest {
  id: string
  household_id: string
  meal_id: string
  requested_by: string
  week_start: string
  note?: string
  status: 'pending' | 'planned' | 'dismissed'
  created_at?: string
  // Joined data
  meal?: Meal
  requester?: HouseholdMember
}
