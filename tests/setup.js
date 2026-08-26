import { NeuroInfoApiClient } from "../dist/index.js";
export const API_BASE = "https://neuro.appstun.net/api/v2";
export const WS_BASE = "wss://neuro.appstun.net/api/v2/ws";
export const API_TOKEN = process.env.NIAC_API_TOKEN ??
    "unltd_9bf11315362e83c900f634be79e7c953fdd064057ead11dfa70746a6d60e5cf927f66f53b0e5734fac5fed94163c991c";
export function createClient(token = API_TOKEN) {
    return new NeuroInfoApiClient(token, { baseUrl: API_BASE });
}
export function expectSuccess(result) {
    if (result.error) {
        throw new Error(`Expected success but got error: ${JSON.stringify(result.error)}`);
    }
    expect(result.data).not.toBeNull();
    return result.data;
}
export function expectFailure(result) {
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    return result.error;
}
