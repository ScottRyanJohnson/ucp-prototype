import { NextResponse } from "next/server"
import { createCheckout, type CartLine } from "@/lib/ucp/checkoutStore"
import { createCheckoutViaMcp } from "@/lib/mcp-fetch-client"

/**
 * Create checkout: try MCP first (when MCP server is running), then fall back to REST.
 * Run `npm run mcp:http` so the browser UI demo uses MCP.
 */
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

    try {
      const checkout = await createCheckoutViaMcp(lines)
      return NextResponse.json(checkout, { status: 201 })
    } catch {
      const checkout = createCheckout(lines)
      return NextResponse.json(checkout, { status: 201 })
    }
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }
}
