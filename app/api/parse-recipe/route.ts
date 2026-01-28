import { NextRequest, NextResponse } from "next/server"

interface ParsedRecipe {
  name: string
  cookTimeMinutes: number
  ingredients: { name: string; quantity?: string }[]
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
    
    if (titleMatch) {
      return {
        name: titleMatch[1].trim(),
        cookTimeMinutes: 30,
        ingredients: [],
        tags: [],
        sourceUrl: url,
      }
    }
  } catch {
    // Ignore
  }
  return null
}
