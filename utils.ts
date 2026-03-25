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
