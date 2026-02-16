/**
 * Minimal MCP client using only fetch (no SDK). Used by API routes to call the
 * UCP MCP server so the browser UI can demo checkout over MCP.
 *
 * Requires the MCP HTTP server to run with enableJsonResponse: true
 * (see mcp/ucp-checkout-mcp-http.ts).
 */

const MCP_SERVER_URL =
  process.env.MCP_SERVER_URL ?? "http://127.0.0.1:7001/mcp";
const UCP_PROFILE = "ucp.checkout.v1";
const PROTOCOL_VERSION = "2024-11-05";

export type CartLine = { productId: string; quantity: number };

export type Checkout = {
  id: string;
  status: "CREATED" | "COMPLETED" | "CANCELED";
  lines: CartLine[];
  createdAt: string;
  updatedAt: string;
};

type JsonRpcRequest = {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
  id: number;
};

type JsonRpcResultResponse = {
  jsonrpc: "2.0";
  result: unknown;
  id: number;
};

type JsonRpcErrorResponse = {
  jsonrpc: "2.0";
  error: { code: number; message: string };
  id: number | null;
};

async function mcpPost(
  body: JsonRpcRequest,
  sessionId?: string,
  protocolVersion?: string
): Promise<{ response: JsonRpcResultResponse | JsonRpcErrorResponse; sessionId?: string; protocolVersion?: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;
  if (protocolVersion) headers["mcp-protocol-version"] = protocolVersion;

  const res = await fetch(MCP_SERVER_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const sessionIdOut = res.headers.get("mcp-session-id") ?? undefined;
  const data = (await res.json()) as JsonRpcResultResponse | JsonRpcErrorResponse;

  if (!res.ok) {
    const err = "error" in data ? (data as JsonRpcErrorResponse).error?.message : res.statusText;
    throw new Error(err ?? `MCP HTTP ${res.status}`);
  }

  if ("error" in data && data.error) {
    throw new Error((data as JsonRpcErrorResponse).error.message ?? "MCP error");
  }

  const result = data as JsonRpcResultResponse;
  const version =
    result.result && typeof result.result === "object" && "protocolVersion" in result.result
      ? (result.result as { protocolVersion: string }).protocolVersion
      : protocolVersion;

  return {
    response: data,
    sessionId: sessionIdOut ?? sessionId,
    protocolVersion: version ?? protocolVersion,
  };
}

function parseCheckoutFromToolResult(result: JsonRpcResultResponse): Checkout {
  const content = (result.result as { content?: Array<{ type: string; text?: string }> })
    ?.content;
  const textItem = content?.find((c) => c.type === "text" && c.text);
  if (!textItem?.text) throw new Error("MCP tool returned no text content");
  const parsed = JSON.parse(textItem.text) as { checkout?: Checkout };
  if (!parsed?.checkout) throw new Error("MCP tool response missing checkout");
  return parsed.checkout;
}

/**
 * Initialize session and return session id + protocol version for subsequent calls.
 */
async function initSession(): Promise<{ sessionId: string; protocolVersion: string }> {
  const initReq: JsonRpcRequest = {
    jsonrpc: "2.0",
    method: "initialize",
    params: {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "ucp-next-demo", version: "0.1.0" },
    },
    id: 1,
  };

  const { response, sessionId, protocolVersion } = await mcpPost(initReq);
  const result = response as JsonRpcResultResponse;
  const pv =
    result.result && typeof result.result === "object" && "protocolVersion" in result.result
      ? (result.result as { protocolVersion: string }).protocolVersion
      : PROTOCOL_VERSION;

  if (!sessionId) throw new Error("MCP server did not return session id");
  return { sessionId, protocolVersion: pv };
}

/**
 * Create a checkout via MCP create_checkout tool. Throws if MCP server is unreachable.
 */
export async function createCheckoutViaMcp(lines: CartLine[]): Promise<Checkout> {
  const { sessionId, protocolVersion } = await initSession();

  const lineItems = lines.map((l) => ({
    item: { id: l.productId },
    quantity: l.quantity,
  }));

  const { response } = await mcpPost(
    {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "create_checkout",
        arguments: {
          _meta: { ucp: { profile: UCP_PROFILE } },
          line_items: lineItems,
        },
      },
      id: 2,
    },
    sessionId,
    protocolVersion
  );

  return parseCheckoutFromToolResult(response as JsonRpcResultResponse);
}

/**
 * Complete a checkout via MCP complete_checkout tool. Throws if MCP server is unreachable.
 */
export async function completeCheckoutViaMcp(id: string): Promise<Checkout> {
  const { sessionId, protocolVersion } = await initSession();

  const { response } = await mcpPost(
    {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "complete_checkout",
        arguments: { _meta: { ucp: { profile: UCP_PROFILE } }, id },
      },
      id: 2,
    },
    sessionId,
    protocolVersion
  );

  return parseCheckoutFromToolResult(response as JsonRpcResultResponse);
}
