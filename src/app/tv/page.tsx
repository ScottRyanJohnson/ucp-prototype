"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { getProductsByMerchant } from "@/lib/catalog/products";

type Checkout = {
  id: string;
  status: "CREATED" | "COMPLETED" | "CANCELED";
  lines: { productId: string; quantity: number }[];
  createdAt: string;
  updatedAt: string;
};

type LogItem = { t: string; message: string };

// URLs the TV agent fetches to discover merchants (/.well-known style)
const DISCOVERY_URLS = [
  { path: "/.well-known/ucp", label: "ScoJo's" },
  { path: "/api/demo/well-known/beans-r-us", label: "Beans R Us" },
];

type DiscoveredMerchant = { id: string; name: string; ok: boolean };

// Discovery step (how the TV finds coffee merchants via .well-known)
const DISCOVERY_STEP = {
  title: "Search coffee merchants (.well-known)",
  modalCopy:
    "The TV platform finds merchants that support coffee checkout by fetching each merchant's UCP manifest at /.well-known/ucp (or the merchant's declared well-known URL). From the manifest it learns the merchant's name, checkout endpoints (REST and/or MCP), and capabilities. It then shows you which merchants have coffee and UCP checkout—e.g. ScoJo's and Beans R Us—so you can choose. For this order we're using ScoJo's.",
} as const;

// UCP flow steps for the panel (user-friendly explanations)
const UCP_STEPS = [
  {
    title: "Parse your order",
    modalCopy:
      "Before calling the merchant, the TV platform turns your natural-language order into structured line items: product IDs and quantities. UCP doesn't define this step—it runs on the TV platform. The result is the payload sent in the Create Checkout request.",
  },
  {
    title: "Create Checkout (UCP)",
    modalCopy:
      "The TV platform sends a Create Checkout request to the merchant with the cart (line items). Under UCP this can be done via REST (POST to the merchant's checkout endpoint) or MCP (create_checkout tool). The merchant returns a checkout ID and status CREATED.",
  },
  {
    title: "Complete Purchase (UCP)",
    modalCopy:
      "The TV platform sends a Complete Checkout request with the checkout ID. Under UCP this is REST (POST to the complete endpoint) or MCP (complete_checkout tool). The merchant finalizes and returns status COMPLETED.",
  },
  {
    title: "Done",
    modalCopy:
      "The order is confirmed. The merchant has processed the purchase according to UCP. The checkout with status COMPLETED is the proof; in a real system the merchant would fulfill the order.",
  },
] as const;

function now() {
  return new Date().toLocaleTimeString();
}

// Parse "2 Agentic Coffee Beans, 1 Decaf" into line items (search within given product list)
function parseOrder(
  text: string,
  productList: { id: string; name: string }[]
): { productId: string; quantity: number }[] {
  const result: { productId: string; quantity: number }[] = [];
  const segments = text.split(/[,&]|\band\b/i).map((s) => s.trim());

  for (const seg of segments) {
    if (!seg) continue;
    const numMatch = seg.match(/^(\d+)\s*(.*)$/);
    const qty = numMatch ? Math.max(1, parseInt(numMatch[1], 10)) : 1;
    const rest = (numMatch ? numMatch[2] : seg).toLowerCase();

    for (const p of productList) {
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
  const [ucpModalStep, setUcpModalStep] = useState<number | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState<DOMRect | null>(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveredMerchants, setDiscoveredMerchants] = useState<
    DiscoveredMerchant[]
  >([]);
  const stepButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Derive UCP step view (needed for discovery effect)
  const showUcpSteps = busy || checkout != null;

  // Re-check merchants via .well-known every time the Coffee options screen is shown
  useEffect(() => {
    if (!panelOpen || showUcpSteps) {
      if (!panelOpen) setDiscoveredMerchants([]);
      return;
    }
    setDiscoveredMerchants([]);
    setDiscoveryLoading(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    Promise.all(
      DISCOVERY_URLS.map(async ({ path }) => {
        try {
          const res = await fetch(origin + path);
          const data = await res.json();
          const id = data?.merchant?.id ?? "unknown";
          const name = data?.merchant?.name ?? id;
          const hasCheckout =
            res.ok && data?.endpoints?.checkout?.create != null;
          return { id, name, ok: hasCheckout };
        } catch {
          return { id: path, name: path, ok: false };
        }
      })
    ).then((results) => {
      setDiscoveredMerchants(results);
      setDiscoveryLoading(false);
    });
  }, [panelOpen, showUcpSteps]);

  useEffect(() => {
    if (ucpModalStep === null) {
      setTooltipAnchor(null);
      return;
    }
    const el = stepButtonRefs.current[ucpModalStep];
    if (el) setTooltipAnchor(el.getBoundingClientRect());
  }, [ucpModalStep]);

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

    const productList = getProductsByMerchant("demo-merchant");
    const lines = parseOrder(chatInput, productList);
    if (lines.length === 0) {
      const names = productList.map((p) => p.name);
      setError(
        `Couldn't find products. Try: ${names.slice(0, 5).join(", ")}${names.length > 5 ? "…" : ""}`
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
  const step0Done = log.some((m) => m.message.includes("Parsing"));
  const step1Done = log.some((m) => m.message.includes("Checkout created"));
  const step2Done = log.some((m) => m.message.includes("Purchase complete"));

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-white">
      {/* TV: single black frame, always same size and 16:9. Initial = image + ask bar. After ask = panel + image + order bar. */}
      <div className="flex flex-1 items-center justify-center overflow-x-auto p-3 md:p-4">
        <div
          className="flex w-[56rem] max-w-full flex-col overflow-hidden rounded-2xl bg-black shadow-2xl"
          style={{
            aspectRatio: "16/9",
            boxShadow: "0 0 0 10px #1a1a1a, 0 0 40px rgba(0,0,0,0.8)",
          }}
        >
          {/* Main area: content image only (initial) or panel + content image (after ask) */}
          <div className="flex min-h-0 flex-1">
            {panelOpen && (
              <div
                className="flex w-72 flex-shrink-0 flex-col border-r border-zinc-800 bg-zinc-900"
                style={{ minWidth: 280 }}
              >
                <div className="border-b border-zinc-800 p-3 font-medium">
                  {showUcpSteps
                    ? "What's happening (UCP)"
                    : "Coffee options"}
                </div>
                {/* Discovery section only on Coffee options; re-check runs when this screen is shown */}
                {!showUcpSteps && (
                  <div className="border-b border-zinc-800 p-2 text-xs text-zinc-400">
                    {discoveryLoading ? (
                      <p>Checking merchants for coffee…</p>
                    ) : discoveredMerchants.length > 0 ? (
                      <>
                        <p className="font-medium text-zinc-300">
                          We checked {discoveredMerchants.length} merchants:
                        </p>
                        <ul className="mt-1 space-y-0.5 pl-1">
                          {discoveredMerchants.map((m) => (
                            <li key={m.id}>
                              {m.name}
                              {m.ok ? (
                                <span className="ml-1 text-emerald-500">
                                  ✓ UCP checkout
                                </span>
                              ) : (
                                <span className="ml-1 text-zinc-500">
                                  (unavailable)
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-zinc-500">
                          Using ScoJo's for this order.
                        </p>
                      </>
                    ) : null}
                  </div>
                )}
                <div className="flex-1 overflow-y-auto p-2">
                  {showUcpSteps ? (
                    <ul className="space-y-3">
                      {/* Discovery step: .well-known tooltip */}
                      <li>
                        <button
                          ref={(el) => {
                            stepButtonRefs.current[0] = el;
                          }}
                          type="button"
                          onClick={() =>
                            setUcpModalStep(ucpModalStep === 0 ? null : 0)
                          }
                          className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:opacity-90 ${
                            ucpModalStep === 0
                              ? "border-emerald-600 bg-emerald-950/50"
                              : "border-zinc-700 text-zinc-500"
                          }`}
                        >
                          <div className="flex items-center gap-2 font-medium">
                            {DISCOVERY_STEP.title}
                          </div>
                        </button>
                      </li>
                      <li className="text-xs text-zinc-500">
                        Using ScoJo's for this order.
                      </li>
                      {UCP_STEPS.map((step, i) => {
                        const stepIndex = i + 1;
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
                          <li key={i}>
                            <button
                              ref={(el) => {
                                stepButtonRefs.current[stepIndex] = el;
                              }}
                              type="button"
                              onClick={() =>
                                setUcpModalStep(
                                  ucpModalStep === stepIndex ? null : stepIndex
                                )
                              }
                              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:opacity-90 ${
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
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="space-y-4">
                      {(
                        [
                          { merchantId: "demo-merchant" as const, name: "ScoJo's Coffee Beans" },
                          { merchantId: "beans-r-us" as const, name: "Beans R Us" },
                        ] as const
                      ).map(({ merchantId, name }) => {
                        const list = getProductsByMerchant(merchantId);
                        if (list.length === 0) return null;
                        return (
                          <div key={merchantId}>
                            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                              {name}
                            </p>
                            <ul className="space-y-2">
                              {list.map((p) => (
                                <li
                                  key={p.id}
                                  className="flex gap-2 rounded-lg border border-zinc-700 px-2 py-2 text-sm"
                                >
                                  {p.image && (
                                    <img
                                      src={p.image}
                                      alt=""
                                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium">{p.name}</div>
                                    {p.description && (
                                      <div className="text-zinc-500">{p.description}</div>
                                    )}
                                    <div className="mt-0.5 flex items-baseline justify-between gap-2 text-zinc-400">
                                      <span>${(p.priceCents / 100).toFixed(2)}</span>
                                      {p.unit && (
                                        <span className="text-xs text-zinc-500">
                                          {p.unit}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Content image: full width (initial) or remaining width (with panel); keeps aspect ratio */}
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/Jennifer-AnistonRachel-Coffee.png"
                alt="TV content"
                className="h-full w-full object-contain"
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
              {(busy || (checkout && checkout.status === "COMPLETED")) && (
                <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-emerald-800 bg-black/80 p-3 text-left">
                  <div className="text-xs font-medium text-emerald-400">
                    TV Platform Agent
                  </div>
                  {checkout?.status === "COMPLETED" && !busy && (
                    <div className="mt-1 text-xs text-emerald-400">
                      Purchase complete. Checkout #{checkout.id.slice(-6)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom bar: Ask the TV (initial) or Order (after ask) */}
          {!panelOpen ? (
            <div className="flex-shrink-0 border-t border-zinc-800 bg-zinc-950 p-3">
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
          ) : (
            <div className="flex-shrink-0 border-t border-zinc-800 p-2">
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
          )}
        </div>
      </div>

      {/* UCP step tooltip - appears to the right of the clicked step button */}
      {ucpModalStep !== null &&
        tooltipAnchor &&
        (ucpModalStep === 0 || UCP_STEPS[ucpModalStep - 1]) && (
          <>
            <div
              className="fixed inset-0 z-40"
              aria-hidden="true"
              onClick={() => setUcpModalStep(null)}
            />
            <div
              className="fixed z-50 w-72 rounded-lg border border-zinc-600 bg-zinc-900 p-3 shadow-xl"
              style={{
                left: tooltipAnchor.right + 8,
                top: tooltipAnchor.top,
              }}
              role="tooltip"
            >
              <div className="flex items-start justify-between gap-2 border-b border-zinc-700 pb-2">
                <span className="text-sm font-semibold text-white">
                  {ucpModalStep === 0
                    ? DISCOVERY_STEP.title
                    : UCP_STEPS[ucpModalStep - 1].title}
                </span>
                <button
                  type="button"
                  onClick={() => setUcpModalStep(null)}
                  className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-300">
                {ucpModalStep === 0
                  ? DISCOVERY_STEP.modalCopy
                  : UCP_STEPS[ucpModalStep - 1].modalCopy}
              </p>
            </div>
          </>
        )}
    </div>
  );
}
