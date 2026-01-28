import { createClient } from "@/lib/supabase/client"
import type { Meal, Settings, WeekPlan, DayPlan, ShoppingItem, Household, HouseholdMember, MealRequest } from "./types"
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

// ============================================
// SEED DATA
// ============================================

const SAMPLE_MEALS = [
  {
    name: "Spaghetti Bolognese",
    tags: ["italian", "comfort food", "family favorite"],
    cookTimeMinutes: 35,
    ingredients: [
      { name: "Spaghetti", quantity: "400g" },
      { name: "Ground beef", quantity: "500g" },
      { name: "Tomato sauce", quantity: "400g" },
      { name: "Onion", quantity: "1 medium" },
      { name: "Garlic", quantity: "3 cloves" },
      { name: "Parmesan cheese", quantity: "50g" },
    ],
  },
  {
    name: "Chicken Stir Fry",
    tags: ["asian", "quick", "healthy"],
    cookTimeMinutes: 20,
    ingredients: [
      { name: "Chicken breast", quantity: "500g" },
      { name: "Bell peppers", quantity: "2" },
      { name: "Broccoli", quantity: "1 head" },
      { name: "Soy sauce", quantity: "3 tbsp" },
      { name: "Ginger", quantity: "1 inch" },
      { name: "Rice", quantity: "2 cups" },
    ],
  },
  {
    name: "Tacos",
    tags: ["mexican", "fun", "family favorite"],
    cookTimeMinutes: 25,
    ingredients: [
      { name: "Ground beef", quantity: "500g" },
      { name: "Taco shells", quantity: "12" },
      { name: "Lettuce", quantity: "1 head" },
      { name: "Tomatoes", quantity: "2" },
      { name: "Cheddar cheese", quantity: "200g" },
      { name: "Sour cream", quantity: "1 cup" },
      { name: "Taco seasoning", quantity: "1 packet" },
    ],
  },
  {
    name: "Grilled Salmon",
    tags: ["seafood", "healthy", "quick"],
    cookTimeMinutes: 20,
    ingredients: [
      { name: "Salmon fillets", quantity: "4" },
      { name: "Lemon", quantity: "2" },
      { name: "Olive oil", quantity: "2 tbsp" },
      { name: "Asparagus", quantity: "1 bunch" },
      { name: "Garlic", quantity: "2 cloves" },
    ],
  },
  {
    name: "Veggie Curry",
    tags: ["vegetarian", "indian", "comfort food"],
    cookTimeMinutes: 40,
    ingredients: [
      { name: "Chickpeas", quantity: "2 cans" },
      { name: "Coconut milk", quantity: "400ml" },
      { name: "Tomatoes", quantity: "400g can" },
      { name: "Spinach", quantity: "200g" },
      { name: "Curry powder", quantity: "2 tbsp" },
      { name: "Rice", quantity: "2 cups" },
      { name: "Onion", quantity: "1 large" },
    ],
  },
  {
    name: "BBQ Chicken Pizza",
    tags: ["pizza", "fun", "family favorite"],
    cookTimeMinutes: 30,
    ingredients: [
      { name: "Pizza dough", quantity: "1" },
      { name: "BBQ sauce", quantity: "1/2 cup" },
      { name: "Chicken breast", quantity: "300g" },
      { name: "Red onion", quantity: "1" },
      { name: "Mozzarella cheese", quantity: "200g" },
      { name: "Cilantro", quantity: "1 bunch" },
    ],
  },
  {
    name: "Beef Burgers",
    tags: ["american", "grilling", "family favorite"],
    cookTimeMinutes: 25,
    ingredients: [
      { name: "Ground beef", quantity: "600g" },
      { name: "Burger buns", quantity: "4" },
      { name: "Cheddar cheese", quantity: "4 slices" },
      { name: "Lettuce", quantity: "4 leaves" },
      { name: "Tomato", quantity: "1 large" },
      { name: "Pickles", quantity: "8 slices" },
    ],
  },
  {
    name: "Pasta Primavera",
    tags: ["italian", "vegetarian", "healthy"],
    cookTimeMinutes: 25,
    ingredients: [
      { name: "Penne pasta", quantity: "400g" },
      { name: "Zucchini", quantity: "2" },
      { name: "Cherry tomatoes", quantity: "200g" },
      { name: "Bell peppers", quantity: "2" },
      { name: "Parmesan cheese", quantity: "50g" },
      { name: "Olive oil", quantity: "3 tbsp" },
    ],
  },
  {
    name: "Chicken Fajitas",
    tags: ["mexican", "quick", "fun"],
    cookTimeMinutes: 25,
    ingredients: [
      { name: "Chicken breast", quantity: "500g" },
      { name: "Flour tortillas", quantity: "8" },
      { name: "Bell peppers", quantity: "3" },
      { name: "Onion", quantity: "1 large" },
      { name: "Fajita seasoning", quantity: "1 packet" },
      { name: "Lime", quantity: "2" },
    ],
  },
  {
    name: "Meatball Subs",
    tags: ["italian", "comfort food", "family favorite"],
    cookTimeMinutes: 35,
    ingredients: [
      { name: "Ground beef", quantity: "500g" },
      { name: "Sub rolls", quantity: "4" },
      { name: "Marinara sauce", quantity: "2 cups" },
      { name: "Mozzarella cheese", quantity: "200g" },
      { name: "Breadcrumbs", quantity: "1/2 cup" },
      { name: "Egg", quantity: "1" },
    ],
  },
  {
    name: "Teriyaki Salmon Bowl",
    tags: ["asian", "healthy", "quick"],
    cookTimeMinutes: 25,
    ingredients: [
      { name: "Salmon fillets", quantity: "2" },
      { name: "Teriyaki sauce", quantity: "1/4 cup" },
      { name: "Rice", quantity: "2 cups" },
      { name: "Edamame", quantity: "1 cup" },
      { name: "Avocado", quantity: "1" },
      { name: "Sesame seeds", quantity: "1 tbsp" },
    ],
  },
  {
    name: "Stuffed Bell Peppers",
    tags: ["healthy", "comfort food"],
    cookTimeMinutes: 45,
    ingredients: [
      { name: "Bell peppers", quantity: "4 large" },
      { name: "Ground turkey", quantity: "500g" },
      { name: "Rice", quantity: "1 cup" },
      { name: "Tomato sauce", quantity: "1 cup" },
      { name: "Cheddar cheese", quantity: "100g" },
      { name: "Onion", quantity: "1" },
    ],
  },
]

export async function seedSampleMeals(): Promise<number> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return 0

  let addedCount = 0
  
  for (const meal of SAMPLE_MEALS) {
    const { error } = await supabase
      .from("meals")
      .insert({
        user_id: user.id,
        name: meal.name,
        tags: meal.tags,
        cook_time_minutes: meal.cookTimeMinutes,
        ingredients: meal.ingredients,
      })

    if (!error) {
      addedCount++
    }
  }

  return addedCount
}

// ============================================
// HOUSEHOLD FUNCTIONS
// ============================================

// Get user's household (if any)
export async function getUserHousehold(): Promise<Household | null> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data, error } = await supabase
    .from("household_members")
    .select("household_id, households(*)")
    .eq("user_id", user.id)
    .single()

  if (error || !data) return null

  const household = data.households as unknown as Household
  return household
}

// Get household members
export async function getHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from("household_members")
    .select("*")
    .eq("household_id", householdId)
    .order("joined_at", { ascending: true })

  if (error) {
    console.error("Error fetching household members:", error)
    return []
  }

  return data || []
}

// Create a new household
export async function createHousehold(name: string, displayName: string): Promise<Household | null> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Generate invite code
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()

  const { data: household, error: householdError } = await supabase
    .from("households")
    .insert({
      name,
      invite_code: inviteCode,
      created_by: user.id,
    })
    .select()
    .single()

  if (householdError || !household) {
    console.error("Error creating household:", householdError)
    return null
  }

  // Add creator as owner
  const { error: memberError } = await supabase
    .from("household_members")
    .insert({
      household_id: household.id,
      user_id: user.id,
      display_name: displayName,
      role: "owner",
    })

  if (memberError) {
    console.error("Error adding owner to household:", memberError)
    // Rollback household creation
    await supabase.from("households").delete().eq("id", household.id)
    return null
  }

  return household
}

// Join a household with invite code
export async function joinHousehold(inviteCode: string, displayName: string): Promise<Household | null> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Find household by invite code
  const { data: household, error: findError } = await supabase
    .from("households")
    .select("*")
    .eq("invite_code", inviteCode.toUpperCase())
    .single()

  if (findError || !household) {
    console.error("Household not found:", findError)
    return null
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", household.id)
    .eq("user_id", user.id)
    .single()

  if (existingMember) {
    return household // Already a member
  }

  // Add as member
  const { error: memberError } = await supabase
    .from("household_members")
    .insert({
      household_id: household.id,
      user_id: user.id,
      display_name: displayName,
      role: "member",
    })

  if (memberError) {
    console.error("Error joining household:", memberError)
    return null
  }

  return household
}

// Leave household
export async function leaveHousehold(): Promise<boolean> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return false

  const { error } = await supabase
    .from("household_members")
    .delete()
    .eq("user_id", user.id)

  if (error) {
    console.error("Error leaving household:", error)
    return false
  }
  return true
}

// Get current user's member info
export async function getCurrentMember(): Promise<HouseholdMember | null> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data, error } = await supabase
    .from("household_members")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (error || !data) return null
  return data
}

// ============================================
// MEAL REQUEST FUNCTIONS
// ============================================

// Get meal requests for a week
export async function getMealRequests(householdId: string, weekStart: string): Promise<MealRequest[]> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from("meal_requests")
    .select(`
      *,
      meals (id, name, tags, cook_time_minutes, ingredients),
      household_members!meal_requests_requested_by_fkey (id, display_name)
    `)
    .eq("household_id", householdId)
    .eq("week_start", weekStart)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching meal requests:", error)
    return []
  }

  return (data || []).map((req) => ({
    id: req.id,
    household_id: req.household_id,
    meal_id: req.meal_id,
    requested_by: req.requested_by,
    week_start: req.week_start,
    note: req.note,
    status: req.status,
    created_at: req.created_at,
    meal: req.meals ? {
      id: req.meals.id,
      name: req.meals.name,
      tags: req.meals.tags || [],
      cookTimeMinutes: req.meals.cook_time_minutes,
      ingredients: req.meals.ingredients || [],
    } : undefined,
    requester: req.household_members ? {
      id: req.household_members.id,
      display_name: req.household_members.display_name,
    } as HouseholdMember : undefined,
  }))
}

// Create a meal request
export async function createMealRequest(
  householdId: string,
  mealId: string,
  weekStart: string,
  note?: string
): Promise<MealRequest | null> {
  const supabase = getSupabase()
  const member = await getCurrentMember()
  
  if (!member) return null

  const { data, error } = await supabase
    .from("meal_requests")
    .insert({
      household_id: householdId,
      meal_id: mealId,
      requested_by: member.id,
      week_start: weekStart,
      note,
      status: "pending",
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating meal request:", error)
    return null
  }

  return data
}

// Update meal request status
export async function updateMealRequestStatus(
  requestId: string,
  status: "pending" | "planned" | "dismissed"
): Promise<boolean> {
  const supabase = getSupabase()
  
  const { error } = await supabase
    .from("meal_requests")
    .update({ status })
    .eq("id", requestId)

  if (error) {
    console.error("Error updating meal request:", error)
    return false
  }
  return true
}

// Delete a meal request
export async function deleteMealRequest(requestId: string): Promise<boolean> {
  const supabase = getSupabase()
  
  const { error } = await supabase
    .from("meal_requests")
    .delete()
    .eq("id", requestId)

  if (error) {
    console.error("Error deleting meal request:", error)
    return false
  }
  return true
}

// Get household meals (shared meals from all members)
export async function getHouseholdMeals(householdId: string): Promise<Meal[]> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching household meals:", error)
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

// ============================================
// SHOPPING LIST
// ============================================

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
