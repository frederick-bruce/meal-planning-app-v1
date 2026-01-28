import { createClient } from "@/lib/supabase/client"
import type { Meal, Settings, WeekPlan, DayPlan, ShoppingItem } from "./types"
import { DEFAULT_SETTINGS } from "./types"

// Helper to get the Supabase client
function getSupabase() {
  return createClient()
}

// Date helpers
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

export function getWeekDays(weekStart: Date): Date[] {
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + i)
    days.push(day)
  }
  return days
}

// Meals CRUD
export async function getMeals(): Promise<Meal[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching meals:", error)
    return []
  }

  return (data || []).map((meal) => ({
    id: meal.id,
    user_id: meal.user_id,
    name: meal.name,
    tags: meal.tags || [],
    cookTimeMinutes: meal.cook_time_minutes,
    ingredients: meal.ingredients || [],
    created_at: meal.created_at,
  }))
}

export async function addMeal(meal: Omit<Meal, "id" | "user_id" | "created_at">): Promise<Meal | null> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data, error } = await supabase
    .from("meals")
    .insert({
      user_id: user.id,
      name: meal.name,
      tags: meal.tags,
      cook_time_minutes: meal.cookTimeMinutes,
      ingredients: meal.ingredients,
    })
    .select()
    .single()

  if (error) {
    console.error("Error adding meal:", error)
    return null
  }

  return {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    tags: data.tags || [],
    cookTimeMinutes: data.cook_time_minutes,
    ingredients: data.ingredients || [],
    created_at: data.created_at,
  }
}

export async function updateMeal(meal: Meal): Promise<boolean> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from("meals")
    .update({
      name: meal.name,
      tags: meal.tags,
      cook_time_minutes: meal.cookTimeMinutes,
      ingredients: meal.ingredients,
    })
    .eq("id", meal.id)

  if (error) {
    console.error("Error updating meal:", error)
    return false
  }
  return true
}

export async function deleteMeal(mealId: string): Promise<boolean> {
  const supabase = getSupabase()
  const { error } = await supabase.from("meals").delete().eq("id", mealId)

  if (error) {
    console.error("Error deleting meal:", error)
    return false
  }
  return true
}

// Settings
export async function getSettings(): Promise<Settings> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return DEFAULT_SETTINGS

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (error || !data) {
    return DEFAULT_SETTINGS
  }

  return {
    user_id: data.user_id,
    dinnersPerWeek: data.dinners_per_week,
    maxCookTimeMinutes: data.max_cook_time_minutes,
    excludedIngredients: data.excluded_ingredients || [],
    allowRepeats: data.allow_repeats,
  }
}

export async function saveSettings(settings: Settings): Promise<boolean> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return false

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      dinners_per_week: settings.dinnersPerWeek,
      max_cook_time_minutes: settings.maxCookTimeMinutes,
      excluded_ingredients: settings.excludedIngredients,
      allow_repeats: settings.allowRepeats,
    },
    { onConflict: "user_id" }
  )

  if (error) {
    console.error("Error saving settings:", error)
    return false
  }
  return true
}

// Week Plans
export async function getWeekPlan(weekStart: string): Promise<WeekPlan | null> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data, error } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    user_id: data.user_id,
    weekStart: data.week_start,
    days: data.days || [],
    created_at: data.created_at,
  }
}

export async function saveWeekPlan(plan: WeekPlan): Promise<boolean> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return false

  // Check if plan exists
  const existing = await getWeekPlan(plan.weekStart)

  if (existing) {
    const { error } = await supabase
      .from("weekly_plans")
      .update({ days: plan.days })
      .eq("user_id", user.id)
      .eq("week_start", plan.weekStart)

    if (error) {
      console.error("Error updating week plan:", error)
      return false
    }
  } else {
    const { error } = await supabase.from("weekly_plans").insert({
      user_id: user.id,
      week_start: plan.weekStart,
      days: plan.days,
    })

    if (error) {
      console.error("Error creating week plan:", error)
      return false
    }
  }
  return true
}

// Plan Generation Logic
export async function generatePlan(weekStart: string): Promise<WeekPlan> {
  const settings = await getSettings()
  const meals = await getMeals()
  const weekStartDate = new Date(weekStart)
  const days = getWeekDays(weekStartDate)

  // Filter eligible meals
  const eligibleMeals = meals.filter((meal) => {
    if (meal.cookTimeMinutes > settings.maxCookTimeMinutes) return false
    const hasExcluded = meal.ingredients.some((ing) =>
      settings.excludedIngredients.some((excluded) =>
        ing.name.toLowerCase().includes(excluded.toLowerCase())
      )
    )
    if (hasExcluded) return false
    return true
  })

  // Select meals for the week
  const selectedMealIds: string[] = []
  const shuffled = [...eligibleMeals].sort(() => Math.random() - 0.5)

  for (let i = 0; i < settings.dinnersPerWeek && shuffled.length > 0; i++) {
    if (settings.allowRepeats) {
      const randomIndex = Math.floor(Math.random() * shuffled.length)
      selectedMealIds.push(shuffled[randomIndex].id)
    } else {
      const meal = shuffled.shift()
      if (meal) selectedMealIds.push(meal.id)
    }
  }

  // Create day plans
  const dayPlans: DayPlan[] = days.map((day, index) => ({
    date: formatDate(day),
    mealId: index < selectedMealIds.length ? selectedMealIds[index] : null,
  }))

  const plan: WeekPlan = {
    weekStart,
    days: dayPlans,
  }

  await saveWeekPlan(plan)
  return plan
}

export async function rerollDay(weekStart: string, dayDate: string): Promise<WeekPlan | null> {
  const plan = await getWeekPlan(weekStart)
  if (!plan) return null

  const settings = await getSettings()
  const meals = await getMeals()

  const usedMealIds = plan.days
    .filter((d) => d.mealId && d.date !== dayDate)
    .map((d) => d.mealId!)

  let eligibleMeals = meals.filter((meal) => {
    if (meal.cookTimeMinutes > settings.maxCookTimeMinutes) return false
    const hasExcluded = meal.ingredients.some((ing) =>
      settings.excludedIngredients.some((excluded) =>
        ing.name.toLowerCase().includes(excluded.toLowerCase())
      )
    )
    if (hasExcluded) return false
    if (!settings.allowRepeats && usedMealIds.includes(meal.id)) return false
    return true
  })

  if (eligibleMeals.length === 0) return plan

  const randomMeal = eligibleMeals[Math.floor(Math.random() * eligibleMeals.length)]

  const updatedDays = plan.days.map((day) =>
    day.date === dayDate ? { ...day, mealId: randomMeal.id } : day
  )

  const updatedPlan = { ...plan, days: updatedDays }
  await saveWeekPlan(updatedPlan)
  return updatedPlan
}

export async function swapDays(weekStart: string, date1: string, date2: string): Promise<WeekPlan | null> {
  const plan = await getWeekPlan(weekStart)
  if (!plan) return null

  const day1 = plan.days.find((d) => d.date === date1)
  const day2 = plan.days.find((d) => d.date === date2)

  if (!day1 || !day2) return plan

  const updatedDays = plan.days.map((day) => {
    if (day.date === date1) return { ...day, mealId: day2.mealId }
    if (day.date === date2) return { ...day, mealId: day1.mealId }
    return day
  })

  const updatedPlan = { ...plan, days: updatedDays }
  await saveWeekPlan(updatedPlan)
  return updatedPlan
}

export async function setDayMeal(weekStart: string, dayDate: string, mealId: string | null): Promise<WeekPlan | null> {
  const plan = await getWeekPlan(weekStart)
  if (!plan) return null

  const updatedDays = plan.days.map((day) =>
    day.date === dayDate ? { ...day, mealId } : day
  )

  const updatedPlan = { ...plan, days: updatedDays }
  await saveWeekPlan(updatedPlan)
  return updatedPlan
}

// Generate shopping list from week plan
export async function generateShoppingList(weekStart: string): Promise<ShoppingItem[]> {
  const plan = await getWeekPlan(weekStart)
  if (!plan) return []

  const meals = await getMeals()
  const ingredientMap = new Map<string, boolean>()

  plan.days.forEach((day) => {
    if (day.mealId) {
      const meal = meals.find((m) => m.id === day.mealId)
      if (meal) {
        meal.ingredients.forEach((ing) => {
          const normalized = ing.name.toLowerCase().trim()
          if (!ingredientMap.has(normalized)) {
            ingredientMap.set(normalized, false)
          }
        })
      }
    }
  })

  return Array.from(ingredientMap.entries()).map(([name, checked]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    checked,
  }))
}
