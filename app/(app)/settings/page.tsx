"use client"

import { useState, useEffect } from "react"
import { X, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Settings, DEFAULT_SETTINGS } from "@/lib/types"
import { getSettings, saveSettings } from "@/lib/store"

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [excludedInput, setExcludedInput] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const loaded = getSettings()
    setSettings(loaded)
    setIsLoaded(true)
  }, [])

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updates }))
    setHasChanges(true)
  }

  const addExcludedIngredient = () => {
    if (excludedInput.trim() && !settings.excludedIngredients.includes(excludedInput.trim())) {
      updateSettings({
        excludedIngredients: [...settings.excludedIngredients, excludedInput.trim()],
      })
      setExcludedInput("")
    }
  }

  const removeExcludedIngredient = (ingredient: string) => {
    updateSettings({
      excludedIngredients: settings.excludedIngredients.filter((i) => i !== ingredient),
    })
  }

  const handleSave = () => {
    saveSettings(settings)
    setHasChanges(false)
    toast({
      title: "Settings saved!",
      description: "Your preferences have been updated.",
    })
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your meal planning preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Plan Generation</CardTitle>
            <CardDescription>
              These settings affect how meal plans are generated and rerolled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="dinnersPerWeek">Dinners per Week</Label>
              <Input
                id="dinnersPerWeek"
                type="number"
                min={1}
                max={7}
                value={settings.dinnersPerWeek}
                onChange={(e) =>
                  updateSettings({
                    dinnersPerWeek: Math.min(7, Math.max(1, parseInt(e.target.value) || 1)),
                  })
                }
                className="max-w-32"
              />
              <p className="text-sm text-muted-foreground">
                How many days should have a planned meal (1-7). Remaining days will be "Off/Leftovers".
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxCookTime">Maximum Cook Time (minutes)</Label>
              <Input
                id="maxCookTime"
                type="number"
                min={1}
                value={settings.maxCookTimeMinutes}
                onChange={(e) =>
                  updateSettings({
                    maxCookTimeMinutes: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
                className="max-w-32"
              />
              <p className="text-sm text-muted-foreground">
                Only meals with cook time at or below this limit will be included in generated plans.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allowRepeats">Allow Repeat Meals</Label>
                <p className="text-sm text-muted-foreground">
                  If enabled, the same meal can appear multiple times in one week.
                </p>
              </div>
              <Switch
                id="allowRepeats"
                checked={settings.allowRepeats}
                onCheckedChange={(checked) => updateSettings({ allowRepeats: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dietary Preferences</CardTitle>
            <CardDescription>
              Exclude ingredients you want to avoid.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="excludedIngredients">Excluded Ingredients</Label>
              <div className="flex gap-2">
                <Input
                  id="excludedIngredients"
                  value={excludedInput}
                  onChange={(e) => setExcludedInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addExcludedIngredient()
                    }
                  }}
                  placeholder="e.g., shellfish, peanuts"
                />
                <Button type="button" variant="secondary" onClick={addExcludedIngredient}>
                  Add
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Meals containing these ingredients will be filtered out when generating plans.
              </p>
            </div>

            {settings.excludedIngredients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {settings.excludedIngredients.map((ingredient) => (
                  <Badge key={ingredient} variant="secondary" className="gap-1">
                    {ingredient}
                    <button
                      type="button"
                      onClick={() => removeExcludedIngredient(ingredient)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                      <span className="sr-only">Remove {ingredient}</span>
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <h3 className="font-medium text-foreground mb-2">How Settings Work</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>
              <strong>Generate Plan:</strong> Uses all settings to select and assign meals for the week.
            </li>
            <li>
              <strong>Reroll:</strong> Replaces a day's meal with another eligible meal based on your settings.
            </li>
            <li>
              Changes take effect the next time you generate or reroll a plan.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
