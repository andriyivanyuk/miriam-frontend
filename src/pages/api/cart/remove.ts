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
  if (!key) return new Response("Bad Request: key", { status: 400 });

  const cart = Cart.readCart(cookies).filter((i) => i.key !== key);
  Cart.writeCart(cookies, cart);

  return redirect("/cart", 303);
}
