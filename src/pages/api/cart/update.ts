export const prerender = false;

import type { APIContext } from "astro";
import { Cart } from "../../../utils/cart";

export function GET() {
  return new Response("Method Not Allowed", { status: 405 });
}

export async function POST({ request, cookies, redirect }: APIContext) {
  const form = await request.formData().catch(() => null);
  if (!form) return new Response("Bad Request", { status: 400 });

  const key = String(form.get("key") || "");
  const qtyStr = form.get("qty");
  const deltaStr = form.get("delta");

  if (!key) return new Response("Bad Request: key", { status: 400 });

  const cart = Cart.readCart(cookies);
  const idx = cart.findIndex((i) => i.key === key);
  if (idx < 0) return redirect("/cart", 303);

  if (typeof deltaStr === "string") {
    const d = Number(deltaStr);
    cart[idx].qty = Math.max(1, (cart[idx].qty || 1) + (isNaN(d) ? 0 : d));
  } else if (typeof qtyStr === "string") {
    const q = Math.max(1, Number(qtyStr));
    cart[idx].qty = isNaN(q) ? 1 : q;
  }

  Cart.writeCart(cookies, cart);
  return redirect("/cart", 303);
}
