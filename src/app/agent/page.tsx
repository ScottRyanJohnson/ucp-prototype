"use client"

import { useMemo, useState } from "react"
import { products, getProductById, getProductNames } from "@/lib/catalog/products"

type Checkout = {
  id: string
  status: "CREATED" | "COMPLETED" | "CANCELED"
  lines: { productId: string; quantity: number }[]
  createdAt: string
  updatedAt: string
}

type LogItem = {
  t: string
  message: string
}

function now() {
  return new Date().toLocaleTimeString()
}

export default function AgentPage() {
  const [instruction, setInstruction] = useState(
    "Buy 1 Agentic Coffee Beans and checkout"
  )
  const [checkout, setCheckout] = useState<Checkout | null>(null)
  const [log, setLog] = useState<LogItem[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const productNameToId = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of products) m.set(p.name.toLowerCase(), p.id)
    return m
  }, [])

  function addLog(message: string) {
    setLog((prev) => [...prev, { t: now(), message }])
  }

  // Super-simple “agent” parser:
  // - looks for a quantity (defaults to 1)
  // - matches a product name exactly (case-insensitive)
  function parseInstruction(text: string): { productId: string; quantity: number } {
    const lower = text.toLowerCase()

    const qtyMatch = lower.match(/\b(\d+)\b/)
    const quantity = qtyMatch ? Math.max(1, Number(qtyMatch[1])) : 1

    // find a product name that appears in the instruction
    for (const [name, id] of productNameToId.entries()) {
      if (lower.includes(name)) return { productId: id, quantity }
    }

    throw new Error(
      `Couldn't find a product name in your instruction. Try one of: ${getProductNames()
        .map((n) => `"${n}"`)
        .join(", ")}`
    )
  }

  async function runAgent() {
    setError(null)
    setCheckout(null)
    setLog([])
    setBusy(true)

    try {
      addLog("Reading instruction…")
      const { productId, quantity } = parseInstruction(instruction)
      const product = getProductById(productId)!
      addLog(`Plan: create checkout for ${quantity} × ${product.name}`)

      addLog("Calling UCP: create checkout…")
      const createRes = await fetch("/api/ucp/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines: [{ productId, quantity }],
        }),
      })
      const created = await createRes.json()
      if (!createRes.ok) throw new Error(created?.error ?? "create checkout failed")
      setCheckout(created)
      addLog(`Checkout created: ${created.id}`)

      addLog("Calling UCP: complete checkout…")
      const completeRes = await fetch(`/api/ucp/checkout/${created.id}/complete`, {
        method: "POST",
      })
      const completed = await completeRes.json()
      if (!completeRes.ok)
        throw new Error(completed?.error ?? "complete checkout failed")
      setCheckout(completed)
      addLog(`Checkout completed ✅ (${completed.status})`)
    } catch (e: any) {
      setError(e.message ?? "unknown error")
      addLog(`Error: ${e.message ?? "unknown error"}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agent</h1>
        <p className="text-sm text-gray-600">
          This page simulates an agent that uses your UCP checkout endpoints.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Instruction</label>
        <textarea
          className="w-full border rounded p-3 min-h-[90px]"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          disabled={busy}
        />
        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
            onClick={runAgent}
            disabled={busy}
          >
            {busy ? "Running…" : "Run agent"}
          </button>
          <button
            className="px-4 py-2 border rounded disabled:opacity-50"
            onClick={() => {
              setInstruction("Buy 1 Agentic Coffee Beans and checkout")
              setCheckout(null)
              setLog([])
              setError(null)
            }}
            disabled={busy}
          >
            Reset
          </button>
        </div>
        {error && <div className="text-red-600 text-sm">Error: {error}</div>}
      </div>

      <div className="grid gap-4">
        <div className="border rounded p-4">
          <div className="font-medium mb-2">Agent log</div>
          <div className="text-sm space-y-1">
            {log.length === 0 ? (
              <div className="text-gray-600">No actions yet.</div>
            ) : (
              log.map((item, i) => (
                <div key={i}>
                  <span className="text-gray-500">[{item.t}]</span> {item.message}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border rounded p-4">
          <div className="font-medium mb-2">Checkout</div>
          <pre className="text-sm bg-gray-100 p-3 rounded overflow-x-auto">
            {JSON.stringify(checkout, null, 2)}
          </pre>
        </div>
      </div>
    </main>
  )
}
