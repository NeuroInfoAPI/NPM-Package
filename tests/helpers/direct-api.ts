import { expect } from "bun:test";
import { API_BASE, API_TOKEN } from "../setup.ts";

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const base = API_BASE.replace(/\/$/, "");
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url;
}

function authHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Fetches raw API data the same way the client unwraps responses:
 * GET {baseUrl}{path}?query → response.data
 */
export async function fetchDirect<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  token: string | null = API_TOKEN,
): Promise<T> {
  const response = await fetch(buildUrl(path, params), { headers: authHeaders(token) });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Direct API ${response.status} ${path}: ${body}`);
  }

  const json = (await response.json()) as { data?: T } | T;
  if (json && typeof json === "object" && "data" in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

/** Mirrors client error envelope for comparison on failing endpoints. */
export async function fetchDirectResult<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  token: string | null = API_TOKEN,
): Promise<{ data: T | null; error: { code: string; message: string; status?: number } | null }> {
  const response = await fetch(buildUrl(path, params), { headers: authHeaders(token) });

  if (!response.ok) {
    try {
      const json = (await response.json()) as { error?: { code: string; message: string } };
      if (json?.error?.code) {
        return {
          data: null,
          error: { ...json.error, status: response.status },
        };
      }
    } catch {
      // fall through
    }
    return {
      data: null,
      error: { code: "HTTP_ERROR", message: `Request failed with status ${response.status}`, status: response.status },
    };
  }

  const json = (await response.json()) as { data?: T } | T;
  const data =
    json && typeof json === "object" && "data" in json ? (json as { data: T }).data : (json as T);
  return { data, error: null };
}

export function assertDeepEqual<T>(clientData: T, directData: T, label: string) {
  expect(clientData).toEqual(directData);
}

export function assertResultsMatch<T>(
  client: { data: T | null; error: { code: string; message: string; status?: number } | null },
  direct: { data: T | null; error: { code: string; message: string; status?: number } | null },
  label: string,
) {
  if (client.error || direct.error) {
    expect(client.data).toBeNull();
    expect(direct.data).toBeNull();
    expect(client.error?.code).toBe(direct.error?.code);
    expect(client.error?.status).toBe(direct.error?.status);
    return;
  }
  assertDeepEqual(client.data as T, direct.data as T, label);
}
