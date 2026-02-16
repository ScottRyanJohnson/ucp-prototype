export type ProductCategory = "coffee" | "merchandise" | "other";

/** Merchant id from .well-known (e.g. demo-merchant = ScoJo's, beans-r-us = Beans R Us) */
export type MerchantId = "demo-merchant" | "beans-r-us";

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
  /** Image URL or path (e.g. /products/agentic-coffee-beans.jpg or placeholder URL) */
  image?: string;
  /** Merchant that sells this product (default demo-merchant for ScoJo's) */
  merchantId?: MerchantId;
};

/** Shared product image (Agentic Coffee Beans image for coffee products) */
const defaultProductImage =
  "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=200&h=200&fit=crop";
/** Beans R Us: different coffee bag / bean imagery for demo */
const beansRUsImage1 =
  "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=200&h=200&fit=crop";
const beansRUsImage2 =
  "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&h=200&fit=crop";
const beansRUsImage4 =
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&h=200&fit=crop";
/** Mug image for Autonomous Mug */
const mugImage =
  "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=200&h=200&fit=crop";

const catalog: Product[] = [
  // Coffee
  {
    id: "agentic-coffee-beans",
    name: "Agentic Coffee Beans",
    priceCents: 1800,
    category: "coffee",
    description: "Medium roast, single-origin",
    unit: "12oz bag",
    image: defaultProductImage,
  },
  {
    id: "decaf-coffee-beans",
    name: "Decaf Coffee Beans",
    priceCents: 1600,
    category: "coffee",
    description: "Swiss water decaf, medium roast",
    unit: "12oz bag",
    image: defaultProductImage,
  },
  {
    id: "dark-roast-coffee",
    name: "Dark Roast Coffee Beans",
    priceCents: 1900,
    category: "coffee",
    description: "Full-bodied dark roast",
    unit: "12oz bag",
    image: defaultProductImage,
  },
  {
    id: "single-origin-ethiopian",
    name: "Single Origin Ethiopian",
    priceCents: 2200,
    category: "coffee",
    description: "Light roast, fruity and floral",
    unit: "12oz bag",
    image: defaultProductImage,
  },
  {
    id: "espresso-blend",
    name: "Espresso Blend",
    priceCents: 2000,
    category: "coffee",
    description: "House blend for espresso",
    unit: "12oz bag",
    image: defaultProductImage,
  },
  // Beans R Us (second merchant for TV discovery demo; different images)
  {
    id: "beans-r-us-house-blend",
    name: "House Blend",
    priceCents: 1400,
    category: "coffee",
    description: "Smooth everyday roast",
    unit: "12oz bag",
    image: beansRUsImage1,
    merchantId: "beans-r-us",
  },
  {
    id: "beans-r-us-colombian",
    name: "Colombian",
    priceCents: 1700,
    category: "coffee",
    description: "Single origin, medium roast",
    unit: "12oz bag",
    image: beansRUsImage2,
    merchantId: "beans-r-us",
  },
  {
    id: "beans-r-us-decaf",
    name: "Decaf",
    priceCents: 1500,
    category: "coffee",
    description: "Water process decaf",
    unit: "12oz bag",
    image: beansRUsImage4,
    merchantId: "beans-r-us",
  },
  {
    id: "beans-r-us-cold-brew",
    name: "Cold Brew Blend",
    priceCents: 1900,
    category: "coffee",
    description: "Coarse grind for cold brew",
    unit: "12oz bag",
    image: beansRUsImage4,
    merchantId: "beans-r-us",
  },
  // Merchandise
  {
    id: "autonomous-mug",
    name: "Autonomous Mug",
    priceCents: 2400,
    category: "merchandise",
    description: "Double-wall insulated",
    image: mugImage,
  },
];

/** All products. Prefer getScoJoProducts(), getCoffeeProducts(), or getProductById() when possible. */
export const products: Product[] = catalog;

/** ScoJo's products only (excludes Beans R Us). Use for /shop. */
export function getScoJoProducts(): Product[] {
  return catalog.filter((p) => (p.merchantId ?? "demo-merchant") === "demo-merchant");
}

/** Products in the coffee category (for TV panel, etc.). ScoJo's only. */
export function getCoffeeProducts(): Product[] {
  return catalog.filter(
    (p) => p.category === "coffee" && (p.merchantId ?? "demo-merchant") === "demo-merchant"
  );
}

/** Coffee products for a given merchant (for TV multi-merchant panel). */
export function getProductsByMerchant(merchantId: MerchantId): Product[] {
  return catalog.filter(
    (p) => p.category === "coffee" && (p.merchantId ?? "demo-merchant") === merchantId
  );
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
