"use client";

import { useMemo, useState } from "react";
import {
  products,
  getCoffeeProducts,
  getProductNames,
} from "@/lib/catalog/products";

type Checkout = {
  id: string;
  status: "CREATED" | "COMPLETED" | "CANCELED";
  lines: { productId: string; quantity: number }[];
  createdAt: string;
  updatedAt: string;
};

type LogItem = { t: string; message: string };

const coffeeProducts = getCoffeeProducts();

// UCP flow steps for the panel (user-friendly explanations)
const UCP_STEPS = [
  {
    title: "Parse your order",
    description:
      "Your text is turned into product line items (e.g. “2 Agentic Coffee” → 2× Agentic Coffee Beans).",
  },
  {
    title: "Create Checkout (UCP via MCP)",
    description:
      "The TV sends your cart via the UCP MCP server (create_checkout tool). Run `npm run mcp:http` to use MCP; otherwise the app falls back to REST.",
  },
  {
    title: "Complete Purchase (UCP)",
    description:
      "The TV tells the merchant to finalize the order (direct REST to the same app so the checkout is always found).",
  },
  {
    title: "Done",
    description: "Your order is confirmed. The merchant has processed the purchase.",
  },
] as const;

function now() {
  return new Date().toLocaleTimeString();
}

// Parse "2 Agentic Coffee Beans, 1 Decaf" into line items
function parseOrder(
  text: string
): { productId: string; quantity: number }[] {
  const result: { productId: string; quantity: number }[] = [];
  const segments = text.split(/[,&]|\band\b/i).map((s) => s.trim());

  for (const seg of segments) {
    if (!seg) continue;
    const numMatch = seg.match(/^(\d+)\s*(.*)$/);
    const qty = numMatch ? Math.max(1, parseInt(numMatch[1], 10)) : 1;
    const rest = (numMatch ? numMatch[2] : seg).toLowerCase();

    for (const p of products) {
      if (rest.includes(p.name.toLowerCase())) {
        result.push({ productId: p.id, quantity: qty });
        break;
      }
    }
  }

  return result;
}

export default function TVPlatformPage() {
  const [question, setQuestion] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [log, setLog] = useState<LogItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addLog(message: string) {
    setLog((prev) => [...prev, { t: now(), message }]);
  }

  function handleAsk() {
    if (!question.trim()) return;
    setPanelOpen(true);
    setError(null);
  }

  async function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || busy) return;

    const lines = parseOrder(chatInput);
    if (lines.length === 0) {
      setError(
        `Couldn't find products. Try: ${getProductNames().join(", ")}`
      );
      return;
    }

    setError(null);
    setBusy(true);
    setLog([]);

    try {
      addLog("Parsing your order…");
      addLog("TV agent: Creating checkout…");
      const createRes = await fetch("/api/ucp/checkout-via-mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines }),
      });
      const created = await createRes.json();
      if (!createRes.ok)
        throw new Error(created?.error ?? "Create checkout failed");
      // Support both { id } and { checkout: { id } } response shapes
      const checkoutId = created?.id ?? created?.checkout?.id;
      if (!checkoutId || typeof checkoutId !== "string")
        throw new Error("Create response missing checkout id");
      setCheckout(created.checkout ?? created);
      addLog(`Checkout created: ${checkoutId}`);

      addLog("TV agent: Completing purchase…");
      const completeRes = await fetch(
        `/api/ucp/checkout/${checkoutId}/complete`,
        { method: "POST" }
      );
      const completed = await completeRes.json();
      if (!completeRes.ok)
        throw new Error(
          (completed?.error ?? "Complete failed") +
            (completed?.hint ? ` (${completed.hint})` : "")
        );
      setCheckout(completed);
      addLog(`Purchase complete ✅ (${completed.status})`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      addLog(`Error: ${msg}`);
  } finally {
    setBusy(false);
    }
  }

  // Derive UCP step progress for the panel
  const showUcpSteps = busy || checkout != null;
  const step0Done = log.some((m) => m.message.includes("Parsing"));
  const step1Done = log.some((m) => m.message.includes("Checkout created"));
  const step2Done = log.some((m) => m.message.includes("Purchase complete"));

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-white">
      {/* TV frame - sized to fit standard laptop screens */}
      <div className="flex flex-1 items-center justify-center p-3 md:p-4">
        <div
          className="flex w-full max-w-4xl overflow-hidden rounded-2xl bg-black shadow-2xl"
          style={{ boxShadow: "0 0 0 10px #1a1a1a, 0 0 40px rgba(0,0,0,0.8)" }}
        >
          {/* Left panel - slides in when user asks */}
          {panelOpen && (
            <div
              className="flex w-72 flex-shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 transition-all"
              style={{ minWidth: 280 }}
            >
              <div className="border-b border-zinc-800 p-3 font-medium">
                {showUcpSteps
                  ? "What's happening (UCP)"
                  : "Coffee options"}
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {showUcpSteps ? (
                  <ul className="space-y-3">
                    {UCP_STEPS.map((step, i) => {
                      const done =
                        (i === 0 && step0Done) ||
                        (i === 1 && step1Done) ||
                        (i === 2 && step2Done) ||
                        (i === 3 && step2Done);
                      const active =
                        (i === 0 && busy && !step0Done) ||
                        (i === 1 && busy && step0Done && !step1Done) ||
                        (i === 2 && busy && step1Done && !step2Done) ||
                        (i === 3 && step2Done);
                      return (
                        <li
                          key={i}
                          className={`rounded-lg border px-3 py-2 text-sm ${
                            active
                              ? "border-emerald-600 bg-emerald-950/50"
                              : done
                                ? "border-zinc-600 bg-zinc-800/50 text-zinc-300"
                                : "border-zinc-700 text-zinc-500"
                          }`}
                        >
                          <div className="flex items-center gap-2 font-medium">
                            {done || active ? (
                              <span
                                className={
                                  active
                                    ? "text-emerald-400"
                                    : "text-emerald-500"
                                }
                              >
                                {done && !active ? "✓" : "⋯"}
                              </span>
                            ) : null}
                            {step.title}
                          </div>
                          <div className="mt-1 text-xs leading-snug text-zinc-400">
                            {step.description}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <ul className="space-y-2">
                    {coffeeProducts.map((p) => (
                      <li
                        key={p.id}
                        className="rounded-lg border border-zinc-700 px-3 py-2 text-sm"
                      >
                        <div className="font-medium">{p.name}</div>
                        {p.description && (
                          <div className="text-zinc-500">{p.description}</div>
                        )}
                        <div className="mt-1 flex items-baseline justify-between gap-2 text-zinc-400">
                          <span>${(p.priceCents / 100).toFixed(2)}</span>
                          {p.unit && (
                            <span className="text-xs text-zinc-500">
                              {p.unit}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="border-t border-zinc-800 p-2">
                <div className="mb-2 max-h-24 overflow-y-auto text-xs text-zinc-400">
                  {log.map((item, i) => (
                    <div key={i}>
                      <span className="text-zinc-500">[{item.t}]</span>{" "}
                      {item.message}
                    </div>
                  ))}
                </div>
                <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="What would you like to order?"
                    className="flex-1 rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm placeholder:text-xs placeholder:text-zinc-500"
                    disabled={busy}
                  />
                  <button
                    type="submit"
                    disabled={busy || !chatInput.trim()}
                    className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {busy ? "…" : "Order"}
                  </button>
                </form>
                {error && (
                  <div className="mt-2 text-xs text-red-400">{error}</div>
                )}
              </div>
            </div>
          )}

          {/* TV screen area - squeezes when panel is open */}
          <div className="flex flex-1 flex-col">
            <div
              className="relative flex flex-1 items-center justify-center overflow-hidden bg-zinc-900"
              style={{ aspectRatio: "16/9", minHeight: 200 }}
            >
              {/* TV screen image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/Jennifer-AnistonRachel-Coffee.png"
                alt="TV content"
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling?.classList.remove("hidden");
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 hidden">
                <div className="text-center">
                  <div className="text-4xl font-light text-zinc-500">
                    Now showing
                  </div>
                  <div className="mt-2 text-xl text-zinc-400">
                    Demo stream • Ask below to buy coffee
                  </div>
                </div>
              </div>
              {/* Agent activity overlay on the TV when buying */}
              {(busy || (checkout && checkout.status === "COMPLETED")) && (
                <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-emerald-800 bg-black/80 p-3 text-left">
                  <div className="text-xs font-medium text-emerald-400">
                    TV Platform Agent
                  </div>
                  <div className="mt-1 max-h-20 overflow-y-auto text-xs text-zinc-300">
                    {log.map((item, i) => (
                      <div key={i}>
                        [{item.t}] {item.message}
                      </div>
                    ))}
                  </div>
                  {checkout?.status === "COMPLETED" && !busy && (
                    <div className="mt-2 text-xs text-emerald-400">
                      Purchase complete. Checkout #{checkout.id.slice(-6)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Question bar - hidden when panel is open so only one prompt shows */}
            {!panelOpen && (
            <div className="border-t border-zinc-800 bg-zinc-950 p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                  placeholder="Ask the TV"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={handleAsk}
                  className="rounded-lg bg-zinc-700 px-4 py-2.5 text-sm font-medium hover:bg-zinc-600"
                >
                  Ask
                </button>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
