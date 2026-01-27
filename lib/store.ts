"use client"

import { Meal, Settings, WeekPlan, ShoppingItem, DEFAULT_SETTINGS, DayPlan } from "./types"

const STORAGE_KEYS = {
  MEALS: "mealmind_meals",
  SETTINGS: "mealmind_settings",
  WEEK_PLANS: "mealmind_week_plans",
  SHOPPING_LIST: "mealmind_shopping_list",
}

// Helper to safely access localStorage
function getStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

function setStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    console.error("Failed to save to localStorage")
  }
}

// Meals CRUD
export function getMeals(): Meal[] {
  return getStorage<Meal[]>(STORAGE_KEYS.MEALS, [])
}

export function saveMeals(meals: Meal[]): void {
  setStorage(STORAGE_KEYS.MEALS, meals)
}

export function addMeal(meal: Meal): void {
  const meals = getMeals()
  meals.push(meal)
  saveMeals(meals)
}

export function updateMeal(updatedMeal: Meal): void {
  const meals = getMeals()
  const index = meals.findIndex((m) => m.id === updatedMeal.id)
  if (index !== -1) {
    meals[index] = updatedMeal
    saveMeals(meals)
  }
}

export function deleteMeal(mealId: string): void {
  const meals = getMeals().filter((m) => m.id !== mealId)
  saveMeals(meals)
}

// Settings
export function getSettings(): Settings {
  return getStorage<Settings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
}

export function saveSettings(settings: Settings): void {
  setStorage(STORAGE_KEYS.SETTINGS, settings)
}

// Week Plans
export function getWeekPlans(): Record<string, WeekPlan> {
  return getStorage<Record<string, WeekPlan>>(STORAGE_KEYS.WEEK_PLANS, {})
}

export function getWeekPlan(weekStart: string): WeekPlan | null {
  const plans = getWeekPlans()
  return plans[weekStart] || null
}

export function saveWeekPlan(plan: WeekPlan): void {
  const plans = getWeekPlans()
  plans[plan.weekStart] = plan
  setStorage(STORAGE_KEYS.WEEK_PLANS, plans)
}

// Shopping List
export function getShoppingList(): ShoppingItem[] {
  return getStorage<ShoppingItem[]>(STORAGE_KEYS.SHOPPING_LIST, [])
}

export function saveShoppingList(items: ShoppingItem[]): void {
  setStorage(STORAGE_KEYS.SHOPPING_LIST, items)
}

// Date helpers
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
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

// Plan Generation Logic
export function generatePlan(weekStart: string): WeekPlan {
  const settings = getSettings()
  const meals = getMeals()
  const weekStartDate = new Date(weekStart)
  const days = getWeekDays(weekStartDate)

  // Filter eligible meals
  const eligibleMeals = meals.filter((meal) => {
    // Check cook time
    if (meal.cookTimeMinutes > settings.maxCookTimeMinutes) return false

    // Check excluded ingredients
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

  return {
    weekStart,
    days: dayPlans,
  }
}

export function rerollDay(weekStart: string, dayDate: string): WeekPlan | null {
  const plan = getWeekPlan(weekStart)
  if (!plan) return null

  const settings = getSettings()
  const meals = getMeals()

  // Get currently used meal IDs
  const usedMealIds = plan.days
    .filter((d) => d.mealId && d.date !== dayDate)
    .map((d) => d.mealId!)

  // Filter eligible meals
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

  // Pick a random meal
  const randomMeal = eligibleMeals[Math.floor(Math.random() * eligibleMeals.length)]

  // Update the plan
  const updatedDays = plan.days.map((day) =>
    day.date === dayDate ? { ...day, mealId: randomMeal.id } : day
  )

  const updatedPlan = { ...plan, days: updatedDays }
  saveWeekPlan(updatedPlan)
  return updatedPlan
}

export function swapDays(weekStart: string, date1: string, date2: string): WeekPlan | null {
  const plan = getWeekPlan(weekStart)
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
  saveWeekPlan(updatedPlan)
  return updatedPlan
}

export function setDayMeal(weekStart: string, dayDate: string, mealId: string | null): WeekPlan | null {
  const plan = getWeekPlan(weekStart)
  if (!plan) return null

  const updatedDays = plan.days.map((day) =>
    day.date === dayDate ? { ...day, mealId } : day
  )

  const updatedPlan = { ...plan, days: updatedDays }
  saveWeekPlan(updatedPlan)
  return updatedPlan
}

// Generate shopping list from week plan
export function generateShoppingList(weekStart: string): ShoppingItem[] {
  const plan = getWeekPlan(weekStart)
  if (!plan) return []

  const meals = getMeals()
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
