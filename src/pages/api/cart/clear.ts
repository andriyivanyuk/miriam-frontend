export const prerender = false;

import type { APIContext } from "astro";

export function GET() {
  return new Response("Method Not Allowed", { status: 405 });
}

export async function POST({ cookies, redirect }: APIContext) {
  cookies.set("cart", "[]", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  return redirect("/cart", 303);
}
