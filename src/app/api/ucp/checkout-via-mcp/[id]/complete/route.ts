import { NextResponse } from "next/server"
import { completeCheckout } from "@/lib/ucp/checkoutStore"
import { completeCheckoutViaMcp } from "@/lib/mcp-fetch-client"

/**
 * Complete checkout: try MCP first (when MCP server is running), then fall back to REST.
 */
export async function POST(
  _: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  try {
    const checkout = await completeCheckoutViaMcp(id)
    return NextResponse.json(checkout)
  } catch {
    const checkout = completeCheckout(id)
    if (!checkout)
      return NextResponse.json(
        {
          error:
            "not found. If using MCP, ensure UCP_BASE_URL points to this app (e.g. http://127.0.0.1:3000).",
        },
        { status: 404 }
      )
    return NextResponse.json(checkout)
  }
}
