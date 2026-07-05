import { describe, expect, test } from "bun:test";
import { NeuroInfoApiWebsocketClient } from "../dist/index.js";
import { API_TOKEN, WS_BASE } from "./setup.ts";
const ALL_EVENTS = [
    "blogFeedUpdate",
    "scheduleUpdate",
    "subathonUpdate",
    "subathonGoalUpdate",
    "streamOnline",
    "streamUpdate",
    "streamOffline",
    "secretneuroaccountOnline",
    "streamRaidIncoming",
    "streamRaidOutgoing",
];
function waitFor(fn, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const tick = () => {
            const value = fn();
            if (value !== undefined)
                return resolve(value);
            if (Date.now() - start > timeoutMs)
                return reject(new Error("waitFor timeout"));
            setTimeout(tick, 50);
        };
        tick();
    });
}
describe("NeuroInfoApiWebsocketClient", () => {
    test("connects with header auth and receives welcome session", async () => {
        const ws = new NeuroInfoApiWebsocketClient(API_TOKEN, {
            baseUrl: WS_BASE,
            authMethod: "header",
            autoHeartbeat: false,
        });
        let sessionId;
        const unsub = ws.on("_connected", (id) => {
            sessionId = id;
        });
        await ws.connect();
        expect(ws.isConnected).toBe(true);
        expect(ws.readyState).toBe(WebSocket.OPEN);
        expect(await waitFor(() => sessionId)).toBeTruthy();
        expect(ws.getSessionId()).toBe(sessionId);
        unsub();
        ws.destroy();
    }, 20000);
    test("ticket auth connects successfully", async () => {
        const ws = new NeuroInfoApiWebsocketClient(API_TOKEN, {
            baseUrl: WS_BASE,
            authMethod: "ticket",
            autoHeartbeat: false,
        });
        let connected = false;
        ws.on("_connected", () => {
            connected = true;
        });
        await ws.connect();
        expect(await waitFor(() => (connected ? true : undefined))).toBe(true);
        ws.destroy();
    }, 20000);
    test("requestEventList returns available events", async () => {
        const ws = new NeuroInfoApiWebsocketClient(API_TOKEN, {
            baseUrl: WS_BASE,
            authMethod: "header",
            autoHeartbeat: false,
        });
        let listMessage;
        ws.on("_message", (message) => {
            if (message.type === "listEvents") {
                listMessage = message.data;
            }
        });
        await ws.connect();
        ws.requestEventList();
        const list = await waitFor(() => listMessage);
        expect(Array.isArray(list.availableEvents)).toBe(true);
        expect(list.availableEvents.length).toBeGreaterThan(0);
        for (const event of ALL_EVENTS) {
            expect(list.availableEvents).toContain(event);
        }
        expect(Array.isArray(list.subscribedEvents)).toBe(true);
        ws.destroy();
    }, 20000);
    test("on() subscribes to events and getSubscribedEvents reflects state", async () => {
        const ws = new NeuroInfoApiWebsocketClient(API_TOKEN, {
            baseUrl: WS_BASE,
            authMethod: "header",
            autoHeartbeat: false,
        });
        const added = [];
        ws.on("_eventAdded", (eventType) => added.push(eventType));
        await ws.connect();
        const unsubSchedule = ws.on("scheduleUpdate", () => { });
        const unsubStream = ws.on("streamUpdate", () => { });
        await waitFor(() => added.includes("scheduleUpdate") && added.includes("streamUpdate") ? true : undefined);
        const subscribed = ws.getSubscribedEvents();
        expect(subscribed).toContain("scheduleUpdate");
        expect(subscribed).toContain("streamUpdate");
        unsubSchedule();
        unsubStream();
        ws.destroy();
    }, 20000);
    test("heartbeat receives pong", async () => {
        const ws = new NeuroInfoApiWebsocketClient(API_TOKEN, {
            baseUrl: WS_BASE,
            authMethod: "header",
            autoHeartbeat: true,
            heartbeatIntervalMs: 5000,
            heartbeatTimeoutMs: 5000,
        });
        let pongReceived = false;
        ws.on("_pong", () => {
            pongReceived = true;
        });
        await ws.connect();
        expect(await waitFor(() => (pongReceived ? true : undefined), 20000)).toBe(true);
        ws.destroy();
    }, 25000);
    test("disconnect emits _disconnected", async () => {
        const ws = new NeuroInfoApiWebsocketClient(API_TOKEN, {
            baseUrl: WS_BASE,
            authMethod: "header",
            autoHeartbeat: false,
            autoReconnect: false,
        });
        let disconnectCode;
        ws.on("_disconnected", (code) => {
            disconnectCode = code;
        });
        await ws.connect();
        ws.disconnect();
        expect(await waitFor(() => (disconnectCode !== undefined ? disconnectCode : undefined))).toBe(1000);
        expect(ws.isConnected).toBe(false);
    }, 20000);
    test("invalid token is rejected", async () => {
        const ws = new NeuroInfoApiWebsocketClient("invalid_token_value", {
            baseUrl: WS_BASE,
            authMethod: "header",
            autoHeartbeat: false,
            autoReconnect: false,
        });
        await expect(ws.connect()).rejects.toThrow();
        ws.destroy();
    }, 20000);
});
