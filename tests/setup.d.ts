import { NeuroInfoApiClient } from "../dist/index.js";
export declare const API_BASE = "https://neuro.appstun.net/api/v2";
export declare const WS_BASE = "wss://neuro.appstun.net/api/v2/ws";
export declare const API_TOKEN: any;
export declare function createClient(token?: string | undefined): NeuroInfoApiClient;
export declare function expectSuccess<T>(result: {
    data: T | null;
    error: unknown;
}): T;
export declare function expectFailure(result: {
    data: unknown;
    error: {
        code: string;
        message: string;
    } | null;
}): {
    code: string;
    message: string;
};
