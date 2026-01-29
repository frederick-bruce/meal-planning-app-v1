import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { name?: string; displayName?: string }
      | null

    const name = body?.name?.trim()
    const displayName = body?.displayName?.trim()

    if (!name || !displayName) {
      return NextResponse.json(
        { error: "Missing name or displayName" },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    const { data: household, error: householdError } = await supabase
      .from("households")
      .insert({
        name,
        invite_code: inviteCode,
        owner_id: user.id,
      })
      .select("*")
      .single()

    if (householdError || !household) {
      return NextResponse.json(
        {
          error: householdError?.message ?? "Failed to create household",
          code: (householdError as any)?.code,
          details: (householdError as any)?.details,
          hint: (householdError as any)?.hint,
        },
        { status: 400 },
      )
    }

    const { error: memberError } = await supabase
      .from("household_members")
      .insert({
        household_id: household.id,
        user_id: user.id,
        display_name: displayName,
        role: "owner",
      })

    if (memberError) {
      await supabase.from("households").delete().eq("id", household.id)
      return NextResponse.json(
        {
          error: memberError.message,
          code: (memberError as any)?.code,
          details: (memberError as any)?.details,
          hint: (memberError as any)?.hint,
        },
        { status: 400 },
      )
    }

    return NextResponse.json(household)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
