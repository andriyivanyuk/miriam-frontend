export type Selection = {
  productId: number | string;
  qty?: number;
  size?: {
    id?: number;
    width?: number | null;
    height?: number | null;
    depth?: number | null;
    price?: number | null;
  } | null;
  body_material?: { id: number; title?: string; img?: string } | null;
  front_material?: { id: number; title?: string; img?: string } | null;
  [k: string]: any;
};

export type CartItem = {
  key: string;
  qty: number;
  selection: Selection;
  addedAt: string;
};

function makeKey(sel: Selection) {
  const pid = sel.productId;
  const sizeKey = sel.size?.id
    ? `sid:${sel.size.id}`
    : `w:${sel.size?.width ?? ""}|h:${sel.size?.height ?? ""}|d:${sel.size?.depth ?? ""}`;
  // Ігноруємо кольори під час мерджу
  return `${pid}|${sizeKey}`;
}

function readCart(cookies: any) {
  try {
    return JSON.parse(cookies.get("cart")?.value || "[]");
  } catch {
    return [];
  }
}

function writeCart(cookies: any, cart: CartItem[]) {
  cookies.set("cart", JSON.stringify(cart), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export const Cart = { makeKey, readCart, writeCart };
