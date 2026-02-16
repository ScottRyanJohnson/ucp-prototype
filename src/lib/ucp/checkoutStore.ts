export type CartLine = {
    productId: string
    quantity: number
  }
  
  export type CheckoutStatus = "CREATED" | "COMPLETED" | "CANCELED"
  
  export type Checkout = {
    id: string
    status: CheckoutStatus
    lines: CartLine[]
    createdAt: string
    updatedAt: string
  }
  
  // Use global so the same store is shared across all API routes (avoids "not found" when Next.js loads modules in different contexts)
  const g = typeof globalThis !== "undefined" ? (globalThis as unknown as { ucpCheckoutStore?: Map<string, Checkout> }) : {}
  const store = g.ucpCheckoutStore ?? (g.ucpCheckoutStore = new Map<string, Checkout>())
  
  function nowIso() {
    return new Date().toISOString()
  }
  
  function randomId() {
    // good enough for prototype
    return `co_${Math.random().toString(16).slice(2)}${Math.random()
      .toString(16)
      .slice(2)}`
  }
  
  export function createCheckout(lines: CartLine[]): Checkout {
    const id = randomId()
    const t = nowIso()
    const checkout: Checkout = {
      id,
      status: "CREATED",
      lines,
      createdAt: t,
      updatedAt: t,
    }
    store.set(id, checkout)
    return checkout
  }
  
  export function getCheckout(id: string): Checkout | null {
    return store.get(id) ?? null
  }
  
  export function updateCheckout(id: string, lines: CartLine[]): Checkout | null {
    const existing = store.get(id)
    if (!existing) return null
    if (existing.status !== "CREATED") return existing // immutable after completion/cancel
    const updated: Checkout = { ...existing, lines, updatedAt: nowIso() }
    store.set(id, updated)
    return updated
  }
  
  export function completeCheckout(id: string): Checkout | null {
    const existing = store.get(id)
    if (!existing) return null
    if (existing.status !== "CREATED") return existing
    const updated: Checkout = { ...existing, status: "COMPLETED", updatedAt: nowIso() }
    store.set(id, updated)
    return updated
  }
  
  export function cancelCheckout(id: string): Checkout | null {
    const existing = store.get(id)
    if (!existing) return null
    if (existing.status !== "CREATED") return existing
    const updated: Checkout = { ...existing, status: "CANCELED", updatedAt: nowIso() }
    store.set(id, updated)
    return updated
  }
  