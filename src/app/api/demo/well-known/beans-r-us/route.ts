import { NextResponse } from "next/server";

/**
 * Stub .well-known-style manifest for demo: "Beans R Us".
 * Used by the TV platform to show multi-merchant discovery;
 * endpoints point at this app so orders still work for the demo.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const manifest = {
    protocol: "UCP",
    version: "0.1",
    merchant: {
      id: "beans-r-us",
      name: "Beans R Us",
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
      rest: { contentType: "application/json" },
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
  };

  return NextResponse.json(manifest, {
    headers: { "cache-control": "public, max-age=60" },
  });
}
