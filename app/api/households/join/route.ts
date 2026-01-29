import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { inviteCode?: string; displayName?: string }
      | null

    const inviteCode = body?.inviteCode?.trim()
    const displayName = body?.displayName?.trim()

    if (!inviteCode || !displayName) {
      return NextResponse.json(
        { error: "Missing inviteCode or displayName" },
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

    const { data: household, error } = await supabase.rpc(
      "join_household_by_invite",
      {
        invite_code: inviteCode,
        display_name: displayName,
      },
    )

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          code: (error as any)?.code,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
        },
        { status: 400 },
      )
    }

    if (!household) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 })
    }

    return NextResponse.json(household)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
