import { expect } from "bun:test";
import { API_BASE, API_TOKEN } from "../setup.ts";
function buildUrl(path, params) {
    const base = API_BASE.replace(/\/$/, "");
    const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined)
                url.searchParams.set(key, String(value));
        }
    }
    return url;
}
function authHeaders(token) {
    const headers = { "Content-Type": "application/json" };
    if (token)
        headers.Authorization = `Bearer ${token}`;
    return headers;
}
/**
 * Fetches raw API data the same way the client unwraps responses:
 * GET {baseUrl}{path}?query → response.data
 */
export async function fetchDirect(path, params, token = API_TOKEN) {
    const response = await fetch(buildUrl(path, params), { headers: authHeaders(token) });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Direct API ${response.status} ${path}: ${body}`);
    }
    const json = (await response.json());
    if (json && typeof json === "object" && "data" in json) {
        return json.data;
    }
    return json;
}
/** Mirrors client error envelope for comparison on failing endpoints. */
export async function fetchDirectResult(path, params, token = API_TOKEN) {
    const response = await fetch(buildUrl(path, params), { headers: authHeaders(token) });
    if (!response.ok) {
        try {
            const json = (await response.json());
            if (json?.error?.code) {
                return {
                    data: null,
                    error: { ...json.error, status: response.status },
                };
            }
        }
        catch {
            // fall through
        }
        return {
            data: null,
            error: { code: "HTTP_ERROR", message: `Request failed with status ${response.status}`, status: response.status },
        };
    }
    const json = (await response.json());
    const data = json && typeof json === "object" && "data" in json ? json.data : json;
    return { data, error: null };
}
export function assertDeepEqual(clientData, directData, label) {
    expect(clientData).toEqual(directData);
}
export function assertResultsMatch(client, direct, label) {
    if (client.error || direct.error) {
        expect(client.data).toBeNull();
        expect(direct.data).toBeNull();
        expect(client.error?.code).toBe(direct.error?.code);
        expect(client.error?.status).toBe(direct.error?.status);
        return;
    }
    assertDeepEqual(client.data, direct.data, label);
}
