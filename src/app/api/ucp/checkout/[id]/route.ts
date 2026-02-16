import { NextResponse } from "next/server"
import { getCheckout, updateCheckout, CartLine } from "@/lib/ucp/checkoutStore"

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const checkout = getCheckout(id)
  if (!checkout) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(checkout)
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  try {
    const body = (await req.json()) as { lines?: CartLine[] }
    const lines = body.lines ?? []

    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: "lines is required and must be a non-empty array" },
        { status: 400 }
      )
    }

    const checkout = updateCheckout(id, lines)
    if (!checkout) return NextResponse.json({ error: "not found" }, { status: 404 })
    return NextResponse.json(checkout)
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }
}
