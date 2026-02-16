"use client"

import { useMemo, useState } from "react"
import { products } from "@/lib/catalog/products"

type Checkout = {
  id: string
  status: "CREATED" | "COMPLETED" | "CANCELED"
  lines: { productId: string; quantity: number }[]
  createdAt: string
  updatedAt: string
}

export default function ShopPage() {
  const [cart, setCart] = useState<Record<string, number>>({})
  const [checkout, setCheckout] = useState<Checkout | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lines = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }))
  }, [cart])

  function addToCart(productId: string) {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }))
  }

  async function createCheckoutFromCart() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/ucp/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "failed to create checkout")
      setCheckout(data)
    } catch (e: any) {
      setError(e.message ?? "unknown error")
    } finally {
      setLoading(false)
    }
  }

  async function complete() {
    if (!checkout) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/ucp/checkout/${checkout.id}/complete`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "failed to complete checkout")
      setCheckout(data)
    } catch (e: any) {
      setError(e.message ?? "unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ScoJo's Coffee Beans</h1>

      <ul className="space-y-4">
        {products.map((product) => (
          <li
            key={product.id}
            className="border rounded-lg p-4 flex gap-4 items-center justify-between"
          >
            <div className="flex gap-3 min-w-0 flex-1">
              {product.image && (
                <img
                  src={product.image}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-md object-cover bg-gray-100"
                />
              )}
              <div className="min-w-0">
                <div className="font-medium">{product.name}</div>
                {product.description && (
                  <div className="text-sm text-gray-600">
                    {product.description}
                  </div>
                )}
                <div className="text-sm font-medium text-gray-800 mt-0.5">
                  ${(product.priceCents / 100).toFixed(2)}
                  {product.unit && (
                    <span className="text-gray-500 font-normal">
                      {" "}
                      · {product.unit}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              className="px-3 py-1.5 bg-black text-white rounded shrink-0"
              onClick={() => addToCart(product.id)}
              disabled={loading}
            >
              Add
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-3">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          onClick={createCheckoutFromCart}
          disabled={loading || lines.length === 0}
        >
          Create Checkout
        </button>

        {checkout?.status === "CREATED" && (
          <button
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            onClick={complete}
            disabled={loading}
          >
            Complete Checkout
          </button>
        )}

        {error && <div className="text-red-600 text-sm">Error: {error}</div>}

        <pre className="bg-gray-100 p-4 rounded text-sm">
          Cart: {JSON.stringify(cart, null, 2)}
        </pre>

        <pre className="bg-gray-100 p-4 rounded text-sm">
          Checkout: {JSON.stringify(checkout, null, 2)}
        </pre>
      </div>
    </main>
  )
}
