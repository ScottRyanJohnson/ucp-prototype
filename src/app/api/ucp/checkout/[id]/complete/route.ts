import { NextResponse } from "next/server"
import { completeCheckout, getCheckout } from "@/lib/ucp/checkoutStore"

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: "missing checkout id" }, { status: 400 })
  const checkout = completeCheckout(id)
  if (!checkout) {
    const existing = getCheckout(id)
    const hint = existing
      ? `checkout exists but status is ${existing.status}`
      : "checkout not in store (create and complete must hit the same app)"
    console.warn("[UCP complete] not found:", { id, hint })
    return NextResponse.json(
      { error: "not found", hint },
      { status: 404 }
    )
  }
  return NextResponse.json(checkout)
}
