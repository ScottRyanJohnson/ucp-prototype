import { NextResponse } from "next/server"
import { createCheckout, CartLine } from "@/lib/ucp/checkoutStore"

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { lines?: CartLine[] }
    const lines = body.lines ?? []

    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: "lines is required and must be a non-empty array" },
        { status: 400 }
      )
    }

    const checkout = createCheckout(lines)
    return NextResponse.json(checkout, { status: 201 })
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }
}
