import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  // 0) базова валідація
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
    });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("data" in body) ||
    typeof (body as any).data !== "object"
  ) {
    return new Response(
      JSON.stringify({ error: "Body must be { data: {...} }" }),
      { status: 400 },
    );
  }

  const STRAPI_URL = import.meta.env.STRAPI_URL;
  const STRAPI_TOKEN = import.meta.env.STRAPI_TOKEN;

  if (!STRAPI_URL || !STRAPI_TOKEN) {
    return new Response(JSON.stringify({ error: "Server is not configured" }), {
      status: 500,
    });
  }

  // 1) форвардимо в Strapi
  const res = await fetch(`${STRAPI_URL}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_TOKEN}`,
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      (json as any)?.error?.message ||
      (json as any)?.message ||
      "Unknown error";
    return new Response(
      JSON.stringify({ ok: false, message: msg, status: res.status }),
      {
        status: res.status,
      },
    );
  }

  // 2) повертаємо тільки те, що треба клієнту
  const id = (json as any)?.data?.id ?? (json as any)?.id ?? null;
  return new Response(JSON.stringify({ ok: true, id }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
