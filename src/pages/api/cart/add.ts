// робимо ендпоінт серверним
export const prerender = false;

import type { APIContext } from "astro";
import type { Selection } from "../../../utils/cart";
import { Cart } from "../../../utils/cart";

export function GET() {
  // щоб відкриття /api/cart/add у браузері не валилося 500
  return new Response("Method Not Allowed", { status: 405 });
}

export async function POST({ request, cookies, redirect }: APIContext) {
  // очікуємо POST з form-urlencoded або multipart
  const form = await request.formData().catch(() => null);
  if (!form) return new Response("Bad Request: form expected", { status: 400 });

  const payload = form.get("payload");
  if (typeof payload !== "string") {
    return new Response("Bad Request: payload", { status: 400 });
  }

  let sel: Selection;
  try {
    sel = JSON.parse(payload);
  } catch {
    return new Response("Bad Request: invalid JSON", { status: 400 });
  }

  if (!sel?.productId) {
    return new Response("Bad Request: productId", { status: 400 });
  }

  // нормалізуємо qty на сервері
  const qty = Math.max(1, Number(sel.qty || 1));
  sel.qty = qty;

  const cart = Cart.readCart(cookies);
  const key = Cart.makeKey(sel);
  const idx = cart.findIndex((i) => i.key === key);

  if (idx >= 0) {
    cart[idx].qty += qty;
    cart[idx].selection = sel;
  } else {
    cart.push({ key, qty, selection: sel, addedAt: new Date().toISOString() });
  }

  Cart.writeCart(cookies, cart);

  // 303 на сторінку кошика
  return redirect("/cart", 303);
}
