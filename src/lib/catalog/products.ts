export type ProductCategory = "coffee" | "merchandise" | "other";

export type Product = {
  id: string;
  name: string;
  /** Price in cents (e.g. 1800 = $18.00) */
  priceCents: number;
  /** Category for filtering (e.g. TV panel shows coffee) */
  category: ProductCategory;
  /** Optional display description */
  description?: string;
  /** Display unit (e.g. "12oz bag") */
  unit?: string;
};

const catalog: Product[] = [
  // Coffee
  {
    id: "agentic-coffee-beans",
    name: "Agentic Coffee Beans",
    priceCents: 1800,
    category: "coffee",
    description: "Medium roast, single-origin",
    unit: "12oz bag",
  },
  {
    id: "decaf-coffee-beans",
    name: "Decaf Coffee Beans",
    priceCents: 1600,
    category: "coffee",
    description: "Swiss water decaf, medium roast",
    unit: "12oz bag",
  },
  {
    id: "dark-roast-coffee",
    name: "Dark Roast Coffee Beans",
    priceCents: 1900,
    category: "coffee",
    description: "Full-bodied dark roast",
    unit: "12oz bag",
  },
  {
    id: "single-origin-ethiopian",
    name: "Single Origin Ethiopian",
    priceCents: 2200,
    category: "coffee",
    description: "Light roast, fruity and floral",
    unit: "12oz bag",
  },
  {
    id: "espresso-blend",
    name: "Espresso Blend",
    priceCents: 2000,
    category: "coffee",
    description: "House blend for espresso",
    unit: "12oz bag",
  },
  // Merchandise
  {
    id: "autonomous-mug",
    name: "Autonomous Mug",
    priceCents: 2400,
    category: "merchandise",
    description: "Double-wall insulated",
  },
];

/** All products. Prefer getCoffeeProducts() or getProductById() when possible. */
export const products: Product[] = catalog;

/** Products in the coffee category (for TV panel, etc.). */
export function getCoffeeProducts(): Product[] {
  return catalog.filter((p) => p.category === "coffee");
}

/** Lookup by id. Returns undefined if not found. */
export function getProductById(id: string): Product | undefined {
  return catalog.find((p) => p.id === id);
}

/** Find product by name (case-insensitive, partial match). */
export function findProductByName(name: string): Product | undefined {
  const lower = name.toLowerCase();
  return catalog.find((p) => p.name.toLowerCase().includes(lower));
}

/** All product names, for error messages and suggestions. */
export function getProductNames(): string[] {
  return catalog.map((p) => p.name);
}
