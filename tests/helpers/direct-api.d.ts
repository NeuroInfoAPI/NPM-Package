/**
 * Fetches raw API data the same way the client unwraps responses:
 * GET {baseUrl}{path}?query → response.data
 */
export declare function fetchDirect<T>(path: string, params?: Record<string, string | number | boolean | undefined>, token?: string | null): Promise<T>;
/** Mirrors client error envelope for comparison on failing endpoints. */
export declare function fetchDirectResult<T>(path: string, params?: Record<string, string | number | boolean | undefined>, token?: string | null): Promise<{
    data: T | null;
    error: {
        code: string;
        message: string;
        status?: number;
    } | null;
}>;
export declare function assertDeepEqual<T>(clientData: T, directData: T, label: string): void;
export declare function assertResultsMatch<T>(client: {
    data: T | null;
    error: {
        code: string;
        message: string;
        status?: number;
    } | null;
}, direct: {
    data: T | null;
    error: {
        code: string;
        message: string;
        status?: number;
    } | null;
}, label: string): void;
