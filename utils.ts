import { DocumentNode, print } from "graphql";

export async function fetchGraphql<V, R>(
  DOCUMENT: DocumentNode,
  type: "query" | "mutation",
  variables?: V,
  token?: string,
) {
  const headers: HeadersInit = {
    "content-type": "application/json;charset=UTF-8",
  };
  if (token) headers["authorization"] = `Bearer ${token}`;

  const body: { [key: string]: unknown } = {};
  body["query"] = print(DOCUMENT);
  if (variables) {
    body["variables"] = variables;
  }

  try {
    const res = await fetch(
      process.env.API_URL ?? "https://api.pricetra.com/graphql",
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      },
    );
    return (await res.json()) as { data?: R; errors?: unknown };
  } catch (err) {
    console.error("Fetch error", body[type], body["variables"], err);
    throw err;
  }
}

export function normalizeUPC(code: string | number): string | null {
  // Convert to string
  let digits = String(code);

  // Remove any non-digit characters
  digits = digits.replace(/\D/g, "");

   if (digits.length === 14) {
    // GTIN-14 → extract UPC-A (last 12 digits)
    return digits.slice(-12);
  }

  if (digits.length === 13) {
    // EAN-13 → often safe to take last 12 (US products)
    return digits.slice(-12);
  }

  if (digits.length === 12) {
    return digits;
  }

  if (digits.length === 11) {
    return digits.padStart(12, "0");
  }

  return null;
}
