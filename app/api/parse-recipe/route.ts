import { NextRequest, NextResponse } from "next/server"

interface ParsedRecipe {
  name: string
  cookTimeMinutes: number
  ingredients: { name: string; quantity?: string }[]
  instructions: string[]
  imageUrl: string | null
  servings: number | null
  nutrition: {
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
  } | null
  tags: string[]
  sourceUrl: string
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Fetch the page HTML
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MealMind/1.0; +https://mealmind.app)",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch recipe page" },
        { status: 400 }
      )
    }

    const html = await response.text()

    // Try to parse JSON-LD structured data (most recipe sites use this)
    const recipe = parseJsonLd(html) || parseMetaTags(html, url)

    if (!recipe) {
      return NextResponse.json(
        { error: "Could not parse recipe from this page. Try a different recipe site." },
        { status: 400 }
      )
    }

    return NextResponse.json(recipe)
  } catch (error) {
    console.error("Error parsing recipe:", error)
    return NextResponse.json(
      { error: "Failed to parse recipe" },
      { status: 500 }
    )
  }
}

function parseJsonLd(html: string): ParsedRecipe | null {
  try {
    // Find all JSON-LD scripts
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    let match

    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const jsonData = JSON.parse(match[1])
        const recipes = findRecipes(jsonData)
        
        if (recipes.length > 0) {
          const recipe = recipes[0]
          return {
            name: recipe.name || "Untitled Recipe",
            cookTimeMinutes: parseDuration(recipe.totalTime || recipe.cookTime || recipe.prepTime) || 30,
            ingredients: parseIngredients(recipe.recipeIngredient || []),
            instructions: parseInstructions(recipe.recipeInstructions),
            imageUrl: parseImageUrl(recipe.image),
            servings: parseServings(recipe.recipeYield),
            nutrition: parseNutrition(recipe.nutrition),
            tags: parseTags(recipe),
            sourceUrl: recipe.url || "",
          }
        }
      } catch {
        continue
      }
    }
  } catch {
    // Ignore parsing errors
  }
  return null
}

function findRecipes(data: unknown): Array<Record<string, unknown>> {
  const recipes: Array<Record<string, unknown>> = []
  
  if (Array.isArray(data)) {
    for (const item of data) {
      recipes.push(...findRecipes(item))
    }
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>
    if (obj["@type"] === "Recipe" || (Array.isArray(obj["@type"]) && obj["@type"].includes("Recipe"))) {
      recipes.push(obj)
    }
    if (obj["@graph"] && Array.isArray(obj["@graph"])) {
      recipes.push(...findRecipes(obj["@graph"]))
    }
  }
  
  return recipes
}

function parseDuration(duration: string | undefined): number | null {
  if (!duration) return null
  
  // Parse ISO 8601 duration (PT1H30M, PT45M, etc.)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (match) {
    const hours = parseInt(match[1] || "0", 10)
    const minutes = parseInt(match[2] || "0", 10)
    return hours * 60 + minutes
  }
  
  // Try to parse plain numbers
  const numMatch = duration.match(/(\d+)/)
  if (numMatch) {
    return parseInt(numMatch[1], 10)
  }
  
  return null
}

function parseImageUrl(image: unknown): string | null {
  if (!image) return null

  if (typeof image === "string") return image

  if (Array.isArray(image)) {
    for (const item of image) {
      const url = parseImageUrl(item)
      if (url) return url
    }
    return null
  }

  if (typeof image === "object") {
    const obj = image as Record<string, unknown>
    const url = obj.url
    if (typeof url === "string") return url
    if (Array.isArray(url)) {
      const first = url.find((u) => typeof u === "string")
      return typeof first === "string" ? first : null
    }
  }

  return null
}

function parseServings(recipeYield: unknown): number | null {
  if (!recipeYield) return null

  const extractNumber = (text: string): number | null => {
    const match = text.match(/(\d+(?:\.\d+)?)/)
    if (!match) return null
    const num = Number(match[1])
    if (!Number.isFinite(num)) return null
    return Math.round(num)
  }

  if (typeof recipeYield === "number") return Math.round(recipeYield)
  if (typeof recipeYield === "string") return extractNumber(recipeYield)

  if (Array.isArray(recipeYield)) {
    for (const item of recipeYield) {
      if (typeof item === "number") return Math.round(item)
      if (typeof item === "string") {
        const n = extractNumber(item)
        if (n) return n
      }
    }
  }

  return null
}

function parseNutrition(nutrition: unknown): ParsedRecipe["nutrition"] {
  if (!nutrition || typeof nutrition !== "object") return null
  const obj = nutrition as Record<string, unknown>

  const parseNumber = (value: unknown): number | undefined => {
    if (typeof value === "number") return value
    if (typeof value !== "string") return undefined
    const match = value.match(/(\d+(?:\.\d+)?)/)
    if (!match) return undefined
    const num = Number(match[1])
    return Number.isFinite(num) ? num : undefined
  }

  const parseCalories = (value: unknown): number | undefined => {
    const num = parseNumber(value)
    return typeof num === "number" ? Math.round(num) : undefined
  }

  const parseMass = (value: unknown): { amount: number; unit: "g" | "mg" | null } | undefined => {
    if (typeof value === "number") return { amount: value, unit: null }
    if (typeof value !== "string") return undefined
    const text = value.toLowerCase()
    const match = text.match(/(\d+(?:\.\d+)?)\s*(mg|g)?/)
    if (!match) return undefined
    const amount = Number(match[1])
    if (!Number.isFinite(amount)) return undefined
    const unit = match[2] === "mg" ? "mg" : match[2] === "g" ? "g" : null
    return { amount, unit }
  }

  const toGrams = (value: unknown): number | undefined => {
    const mass = parseMass(value)
    if (!mass) return undefined
    if (mass.unit === "mg") return mass.amount / 1000
    return mass.amount
  }

  const toMg = (value: unknown): number | undefined => {
    const mass = parseMass(value)
    if (!mass) return undefined
    if (mass.unit === "g") return mass.amount * 1000
    return mass.amount
  }

  const calories = parseCalories(obj.calories)
  const proteinG = toGrams(obj.proteinContent)
  const fatG = toGrams(obj.fatContent)
  const saturatedFatG = toGrams(obj.saturatedFatContent)
  const transFatG = toGrams(obj.transFatContent)
  const carbsG = toGrams(obj.carbohydrateContent)
  const fiberG = toGrams(obj.fiberContent)
  const sugarG = toGrams(obj.sugarContent)
  const sodiumMg = toMg(obj.sodiumContent)
  const cholesterolMg = toMg(obj.cholesterolContent)

  if (
    calories === undefined &&
    proteinG === undefined &&
    fatG === undefined &&
    saturatedFatG === undefined &&
    transFatG === undefined &&
    carbsG === undefined
    && fiberG === undefined
    && sugarG === undefined
    && sodiumMg === undefined
    && cholesterolMg === undefined
  ) {
    return null
  }

  return {
    calories,
    proteinG,
    fatG,
    saturatedFatG,
    transFatG,
    carbsG,
    fiberG,
    sugarG,
    sodiumMg,
    cholesterolMg,
  }
}

function parseIngredients(ingredients: unknown[]): { name: string; quantity?: string }[] {
  return ingredients
    .filter((ing): ing is string => typeof ing === "string")
    .map((ing) => {
      // Try to split quantity from ingredient name
      const match = ing.match(/^([\d\s\/½⅓⅔¼¾⅛⅜⅝⅞]+\s*(?:cups?|tbsp|tsp|oz|lb|g|kg|ml|l|teaspoons?|tablespoons?|ounces?|pounds?|grams?|kilograms?|milliliters?|liters?)?)\s+(.+)$/i)
      
      if (match) {
        return {
          quantity: match[1].trim(),
          name: match[2].trim(),
        }
      }
      
      return { name: ing.trim() }
    })
    .filter((ing) => ing.name.length > 0)
}

function parseInstructions(recipeInstructions: unknown): string[] {
  const steps: string[] = []

  const pushStep = (text: string) => {
    const cleaned = text.replace(/\s+/g, " ").trim()
    if (cleaned) steps.push(cleaned)
  }

  const walk = (value: unknown) => {
    if (!value) return

    if (typeof value === "string") {
      // Some sites return a single blob; try to split on newlines.
      const parts = value
        .split(/\r?\n/)
        .map((p) => p.trim())
        .filter(Boolean)
      if (parts.length > 1) {
        parts.forEach(pushStep)
      } else {
        pushStep(value)
      }
      return
    }

    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }

    if (typeof value === "object") {
      const obj = value as Record<string, unknown>

      // HowToSection can have itemListElement
      if (Array.isArray(obj.itemListElement)) {
        obj.itemListElement.forEach(walk)
      }

      // HowToStep often has "text"
      if (typeof obj.text === "string") {
        pushStep(obj.text)
      }

      // Sometimes "name" is the step text
      if (typeof obj.name === "string" && !obj.text) {
        pushStep(obj.name)
      }

      return
    }
  }

  walk(recipeInstructions)

  // Deduplicate while keeping order
  const seen = new Set<string>()
  return steps.filter((s) => {
    if (seen.has(s)) return false
    seen.add(s)
    return true
  })
}

function parseTags(recipe: Record<string, unknown>): string[] {
  const tags: string[] = []
  
  // Add cuisine
  if (recipe.recipeCuisine) {
    if (Array.isArray(recipe.recipeCuisine)) {
      tags.push(...recipe.recipeCuisine.map((c) => String(c).toLowerCase()))
    } else {
      tags.push(String(recipe.recipeCuisine).toLowerCase())
    }
  }
  
  // Add category
  if (recipe.recipeCategory) {
    if (Array.isArray(recipe.recipeCategory)) {
      tags.push(...recipe.recipeCategory.map((c) => String(c).toLowerCase()))
    } else {
      tags.push(String(recipe.recipeCategory).toLowerCase())
    }
  }
  
  // Add keywords
  if (recipe.keywords) {
    const keywords = typeof recipe.keywords === "string" 
      ? recipe.keywords.split(",").map((k) => k.trim().toLowerCase())
      : Array.isArray(recipe.keywords) 
        ? recipe.keywords.map((k) => String(k).toLowerCase())
        : []
    tags.push(...keywords.slice(0, 3)) // Limit to 3 keywords
  }
  
  // Deduplicate and limit
  return [...new Set(tags)].slice(0, 5)
}

function parseMetaTags(html: string, url: string): ParsedRecipe | null {
  try {
    // Try to get title from og:title or title tag
    const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<title[^>]*>([^<]+)<\/title>/i)

    const imageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    
    if (titleMatch) {
      return {
        name: titleMatch[1].trim(),
        cookTimeMinutes: 30,
        ingredients: [],
        instructions: [],
        imageUrl: imageMatch ? imageMatch[1].trim() : null,
        servings: null,
        nutrition: null,
        tags: [],
        sourceUrl: url,
      }
    }
  } catch {
    // Ignore
  }
  return null
}
