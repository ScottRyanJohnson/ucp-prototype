// mcp/ucp-checkout-mcp-http.ts
//
// Remote (network) MCP gateway for merchant checkout tools using
// Streamable HTTP transport (your SDK flavor: transport.handleRequest).
//
// Env vars:
// - UCP_BASE_URL (default: http://127.0.0.1:3000)
// - MCP_PORT     (default: 7001)
// - MCP_PATH     (default: /mcp)

import http from "node:http"
import { z } from "zod"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"

const UCP_BASE_URL = process.env.UCP_BASE_URL ?? "http://127.0.0.1:3000"
const MCP_PORT = Number(process.env.MCP_PORT ?? "7001")
const MCP_PATH = process.env.MCP_PATH ?? "/mcp"

//
// ---------------------------
// Zod schemas (tool params)
// ---------------------------
//

const MetaShape = {
  _meta: z.object({
    ucp: z.object({
      profile: z.string().min(1),
    }),
  }),
} as const

const LineItem = z.object({
  item: z.object({
    id: z.string().min(1),
  }),
  quantity: z.number().int().positive(),
})

const CreateCheckoutParams = {
  ...MetaShape,
  idempotency_key: z.string().optional(),
  currency: z.string().optional(),
  line_items: z.array(LineItem).min(1),
} as const

const IdParams = {
  ...MetaShape,
  id: z.string().min(1),
} as const

const UpdateCheckoutParams = {
  ...MetaShape,
  id: z.string().min(1),
  line_items: z.array(LineItem).min(1),
} as const

//
// ---------------------------
// Helpers
// ---------------------------
//

function toLines(line_items: Array<z.infer<typeof LineItem>>) {
  return line_items.map((li) => ({
    productId: li.item.id,
    quantity: li.quantity,
  }))
}

function jsonText(obj: unknown) {
  return JSON.stringify(obj, null, 2)
}

async function assertOk(res: Response, label: string) {
  if (res.ok) return

  let body = ""
  try {
    body = await res.text()
  } catch {
    // ignore
  }

  throw new Error(`${label} failed: HTTP ${res.status}${body ? `\n${body}` : ""}`)
}

//
// ---------------------------
// Build MCP server + tools
// ---------------------------
//

function buildMcpServer() {
  const server = new McpServer({
    name: "ucp-checkout-mcp",
    version: "0.1.0",
  })

  server.tool(
    "create_checkout",
    CreateCheckoutParams,
    { title: "Create a new checkout session", idempotentHint: true },
    async (p, _extra) => {
      const res = await fetch(`${UCP_BASE_URL}/api/ucp/checkout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines: toLines(p.line_items) }),
      })

      await assertOk(res, "create_checkout")
      const checkout = await res.json()

      return { content: [{ type: "text", text: jsonText({ checkout }) }] }
    }
  )

  server.tool(
    "get_checkout",
    IdParams,
    { title: "Get a checkout session", readOnlyHint: true },
    async (p, _extra) => {
      const res = await fetch(`${UCP_BASE_URL}/api/ucp/checkout/${p.id}`)
      await assertOk(res, "get_checkout")
      const checkout = await res.json()

      return { content: [{ type: "text", text: jsonText({ checkout }) }] }
    }
  )

  server.tool(
    "update_checkout",
    UpdateCheckoutParams,
    { title: "Update checkout line items", idempotentHint: true },
    async (p, _extra) => {
      const res = await fetch(`${UCP_BASE_URL}/api/ucp/checkout/${p.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines: toLines(p.line_items) }),
      })

      await assertOk(res, "update_checkout")
      const checkout = await res.json()

      return { content: [{ type: "text", text: jsonText({ checkout }) }] }
    }
  )

  server.tool(
    "complete_checkout",
    IdParams,
    { title: "Complete a checkout", destructiveHint: true },
    async (p, _extra) => {
      const res = await fetch(`${UCP_BASE_URL}/api/ucp/checkout/${p.id}/complete`, {
        method: "POST",
      })

      await assertOk(res, "complete_checkout")
      const checkout = await res.json()

      return { content: [{ type: "text", text: jsonText({ checkout }) }] }
    }
  )

  server.tool(
    "cancel_checkout",
    IdParams,
    { title: "Cancel a checkout", destructiveHint: true },
    async (p, _extra) => {
      const res = await fetch(`${UCP_BASE_URL}/api/ucp/checkout/${p.id}/cancel`, {
        method: "POST",
      })

      await assertOk(res, "cancel_checkout")
      const checkout = await res.json()

      return { content: [{ type: "text", text: jsonText({ checkout }) }] }
    }
  )

  return server
}

//
// ---------------------------
// HTTP host (Streamable HTTP)
// ---------------------------
//

async function main() {
  const server = buildMcpServer()

  // enableJsonResponse: true so simple fetch clients (e.g. Next.js API) get 200 + JSON instead of SSE
  const transport = new StreamableHTTPServerTransport({ enableJsonResponse: true })

  // Wire server ↔ transport once
  await server.connect(transport)

  // Optional: log transport errors
  transport.onerror = (err) => {
    console.error("MCP transport error:", err)
  }

  const httpServer = http.createServer(async (req, res) => {
    try {
      const url = req.url ?? "/"
      if (!url.startsWith(MCP_PATH)) {
        res.writeHead(404, { "content-type": "text/plain" })
        res.end("Not Found")
        return
      }

      // Delegate the request to the transport
      await transport.handleRequest(req, res)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      try {
        res.writeHead(500, { "content-type": "text/plain" })
        res.end(msg)
      } catch {
        // ignore
      }
    }
  })

  httpServer.listen(MCP_PORT, "127.0.0.1", () => {
    console.log(`MCP (Streamable HTTP) listening on http://127.0.0.1:${MCP_PORT}${MCP_PATH}`)
    console.log(`Proxying tool calls to merchant at ${UCP_BASE_URL}`)
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
