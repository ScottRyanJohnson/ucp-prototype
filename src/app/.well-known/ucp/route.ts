import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const baseUrl = `${url.protocol}//${url.host}`

  // Minimal, prototype-friendly manifest.
  // We'll evolve this as we add MCP and more capabilities.
  const manifest = {
    protocol: "UCP",
    version: "0.1",
    merchant: {
      id: "demo-merchant",
      name: "ScoJo's Coffee Beans",
    },
    endpoints: {
      checkout: {
        create: `${baseUrl}/api/ucp/checkout`,
        get: `${baseUrl}/api/ucp/checkout/{id}`,
        update: `${baseUrl}/api/ucp/checkout/{id}`,
        complete: `${baseUrl}/api/ucp/checkout/{id}/complete`,
        cancel: `${baseUrl}/api/ucp/checkout/{id}/cancel`,
      },
    },
    bindings: {
      rest: {
        contentType: "application/json",
      },
      mcp: {
        available: true,
        capabilities: {
          checkout: {
            binding: "ucp.checkout.v1",
            tools: [
              "create_checkout",
              "get_checkout",
              "update_checkout",
              "complete_checkout",
              "cancel_checkout",
            ],
          },
        },
      },
    },
  }  

  return NextResponse.json(manifest, {
    headers: {
      // This is a “well-known” config; caching is fine but keep it short while iterating
      "cache-control": "public, max-age=60",
    },
  })
}
