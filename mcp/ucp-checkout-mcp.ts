import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const BASE_URL = process.env.UCP_BASE_URL ?? "http://127.0.0.1:3000";

const MetaShape = {
  _meta: z.object({
    ucp: z.object({
      profile: z.string().min(1),
    }),
  }),
} as const;

const LineItem = z.object({
  item: z.object({ id: z.string().min(1) }),
  quantity: z.number().int().positive(),
});

const CreateCheckoutParams = {
  ...MetaShape,
  idempotency_key: z.string().optional(),
  currency: z.string().optional(),
  line_items: z.array(LineItem).min(1),
} as const;

const IdParams = {
  ...MetaShape,
  id: z.string().min(1),
} as const;

const UpdateCheckoutParams = {
  ...MetaShape,
  id: z.string().min(1),
  line_items: z.array(LineItem).min(1),
} as const;


type RestCheckout = {
  id: string;
  status: "CREATED" | "COMPLETED" | "CANCELED";
  lines: { productId: string; quantity: number }[];
  createdAt: string;
  updatedAt: string;
};

function toRestLines(line_items: Array<{ item: { id: string }; quantity: number }>) {
  return line_items.map((li) => ({ productId: li.item.id, quantity: li.quantity }));
}

function toUcpCheckout(rest: RestCheckout) {
  return {
    id: rest.id,
    status: rest.status,
    line_items: rest.lines.map((l) => ({ item: { id: l.productId }, quantity: l.quantity })),
    createdAt: rest.createdAt,
    updatedAt: rest.updatedAt,
  };
}

async function rest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error ?? `HTTP ${res.status}`);
  return data as T;
}

const server = new McpServer({ name: "ucp-checkout-mcp", version: "0.1.0" });

server.tool("create_checkout", "Create a checkout session.", CreateCheckoutParams, async (p) => {
  const checkout = await rest<RestCheckout>("/api/ucp/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lines: toRestLines(p.line_items) }),
  });
  return { content: [{ type: "text", text: JSON.stringify({ checkout: toUcpCheckout(checkout) }, null, 2) }] };
});

server.tool("get_checkout", "Get a checkout session by id.", IdParams, async (p) => {
  const checkout = await rest<RestCheckout>(`/api/ucp/checkout/${p.id}`);
  return { content: [{ type: "text", text: JSON.stringify({ checkout: toUcpCheckout(checkout) }, null, 2) }] };
});

server.tool("update_checkout", "Update a checkout session.", UpdateCheckoutParams, async (p) => {
  const checkout = await rest<RestCheckout>(`/api/ucp/checkout/${p.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lines: toRestLines(p.line_items) }),
  });
  return { content: [{ type: "text", text: JSON.stringify({ checkout: toUcpCheckout(checkout) }, null, 2) }] };
});

server.tool("complete_checkout", "Complete a checkout session.", IdParams, async (p) => {
  const checkout = await rest<RestCheckout>(`/api/ucp/checkout/${p.id}/complete`, { method: "POST" });
  return { content: [{ type: "text", text: JSON.stringify({ checkout: toUcpCheckout(checkout) }, null, 2) }] };
});

server.tool("cancel_checkout", "Cancel a checkout session.", IdParams, async (p) => {
  const checkout = await rest<RestCheckout>(`/api/ucp/checkout/${p.id}/cancel`, { method: "POST" });
  return { content: [{ type: "text", text: JSON.stringify({ checkout: toUcpCheckout(checkout) }, null, 2) }] };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
