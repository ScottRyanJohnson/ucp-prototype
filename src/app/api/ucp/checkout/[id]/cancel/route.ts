import { NextResponse } from "next/server"
import { cancelCheckout } from "@/lib/ucp/checkoutStore"

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const checkout = cancelCheckout(id)
  if (!checkout) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(checkout)
}
