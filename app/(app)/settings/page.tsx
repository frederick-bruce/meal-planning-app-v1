"use client"

import { useState, useEffect } from "react"
import { X, Save, Users, Copy, LogOut, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import type { Settings, Household, HouseholdMember } from "@/lib/types"
import { DEFAULT_SETTINGS } from "@/lib/types"
import {
  getSettings,
  saveSettings,
  getUserHousehold,
  getHouseholdMembers,
  createHousehold,
  joinHouseholdDetailed,
  leaveHousehold,
} from "@/lib/db"

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [excludedInput, setExcludedInput] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const { toast } = useToast()

  // Household state
  const [household, setHousehold] = useState<Household | null>(null)
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [householdName, setHouseholdName] = useState("")
  const [createDisplayName, setCreateDisplayName] = useState("")
  const [joinDisplayName, setJoinDisplayName] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadHousehold = async () => {
    const h = await getUserHousehold()
    setHousehold(h)
    if (h) {
      const m = await getHouseholdMembers(h.id)
      setMembers(m)
    }
  }

  useEffect(() => {
    const loadSettings = async () => {
      const loaded = await getSettings()
      setSettings(loaded)
      await loadHousehold()
      setIsLoaded(true)
    }
    loadSettings()
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

  const handleSave = async () => {
    await saveSettings(settings)
    setHasChanges(false)
    toast({
      title: "Settings saved!",
      description: "Your preferences have been updated.",
    })
  }

  const handleCreateHousehold = async () => {
    if (!householdName.trim() || !createDisplayName.trim()) return
    setIsSubmitting(true)
    const h = await createHousehold(householdName.trim(), createDisplayName.trim())
    setIsSubmitting(false)
    if (h) {
      await loadHousehold()
      setShowCreateDialog(false)
      setHouseholdName("")
      setCreateDisplayName("")
      toast({
        title: "Household created!",
        description: `Share the code ${h.invite_code} with your family.`,
      })
    } else {
      toast({
        title: "Failed to create household",
        variant: "destructive",
      })
    }
  }

  const handleJoinHousehold = async () => {
    if (!inviteCode.trim() || !joinDisplayName.trim()) return
    setIsSubmitting(true)
    const result = await joinHouseholdDetailed(inviteCode.trim(), joinDisplayName.trim())
    setIsSubmitting(false)
    if (result.household) {
      await loadHousehold()
      setShowJoinDialog(false)
      setInviteCode("")
      setJoinDisplayName("")
      toast({
        title: "Joined household!",
        description: `You're now part of ${result.household.name}.`,
      })
    } else {
      const status = result.error?.status
      const message = result.error?.message

      toast({
        title:
          status === 401
            ? "Please log in"
            : status === 404
              ? "Invalid invite code"
              : "Couldn't join household",
        description:
          message ||
          (status === 404
            ? "Please check the code and try again."
            : "Please try again in a moment."),
        variant: "destructive",
      })
    }
  }

  const handleLeaveHousehold = async () => {
    const success = await leaveHousehold()
    if (success) {
      setHousehold(null)
      setMembers([])
      toast({
        title: "Left household",
        description: "You've left the household.",
      })
    }
  }

  const copyInviteCode = () => {
    if (household) {
      navigator.clipboard.writeText(household.invite_code)
      toast({ title: "Invite code copied!" })
    }
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

        {/* Household Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Household
            </CardTitle>
            <CardDescription>
              Share meals and plan together with family members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {household ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{household.name}</p>
                    <p className="text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={copyInviteCode}>
                      <Copy className="w-4 h-4 mr-1" />
                      {household.invite_code}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Members</Label>
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between py-2 px-3 bg-background border rounded-lg">
                        <span className="text-sm text-foreground">{member.display_name}</span>
                        <Badge variant={member.role === 'owner' ? 'default' : 'secondary'} className="text-xs">
                          {member.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={handleLeaveHousehold}>
                  <LogOut className="w-4 h-4 mr-1" />
                  Leave Household
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Create a household to share your meal library with family and let them request meals for the week.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Users className="w-4 h-4 mr-2" />
                    Create Household
                  </Button>
                  <Button variant="outline" onClick={() => setShowJoinDialog(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Join with Code
                  </Button>
                </div>
              </div>
            )}
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

      {/* Create Household Dialog */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) {
            setHouseholdName("")
            setCreateDisplayName("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Household</DialogTitle>
            <DialogDescription>
              Create a household to share meals with your family.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="householdName">Household Name</Label>
              <Input
                id="householdName"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="e.g., The Smith Family"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="createDisplayName">Your Display Name</Label>
              <Input
                id="createDisplayName"
                value={createDisplayName}
                onChange={(e) => setCreateDisplayName(e.target.value)}
                placeholder="e.g., Mom, Dad, Alex"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateHousehold}
              disabled={isSubmitting || !householdName.trim() || !createDisplayName.trim()}
            >
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Household Dialog */}
      <Dialog
        open={showJoinDialog}
        onOpenChange={(open) => {
          setShowJoinDialog(open)
          if (!open) {
            setInviteCode("")
            setJoinDisplayName("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Household</DialogTitle>
            <DialogDescription>
              Enter the invite code shared by a household member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <Input
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g., ABC123"
                maxLength={6}
                className="uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="joinDisplayName">Your Display Name</Label>
              <Input
                id="joinDisplayName"
                value={joinDisplayName}
                onChange={(e) => setJoinDisplayName(e.target.value)}
                placeholder="e.g., Mom, Dad, Alex"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleJoinHousehold}
              disabled={isSubmitting || !inviteCode.trim() || !joinDisplayName.trim()}
            >
              {isSubmitting ? "Joining..." : "Join"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
