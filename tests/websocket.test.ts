import { describe, expect, test } from "bun:test";
import { NeuroInfoApiWebsocketClient, type WsEventType, type XFeedUpdateData } from "../dist/index.js";
import { API_TOKEN, WS_BASE } from "./setup.ts";

const ALL_EVENTS: WsEventType[] = [
  "blogFeedUpdate",
  "xFeedUpdate",
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

function waitFor<T>(fn: () => T | undefined, timeoutMs = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      const value = fn();
      if (value !== undefined) return resolve(value);
      if (Date.now() - start > timeoutMs) return reject(new Error("waitFor timeout"));
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

    let sessionId: string | undefined;
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

    let listMessage: { availableEvents: WsEventType[]; subscribedEvents: WsEventType[] } | undefined;

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

    const added: WsEventType[] = [];
    ws.on("_eventAdded", (eventType) => added.push(eventType));

    await ws.connect();

    const unsubSchedule = ws.on("scheduleUpdate", () => {});
    const unsubStream = ws.on("streamUpdate", () => {});
    const unsubXFeed = ws.on("xFeedUpdate", () => {});

    await waitFor(() =>
      added.includes("scheduleUpdate") && added.includes("streamUpdate") && added.includes("xFeedUpdate") ? true : undefined,
    );

    const subscribed = ws.getSubscribedEvents();
    expect(subscribed).toContain("scheduleUpdate");
    expect(subscribed).toContain("streamUpdate");
    expect(subscribed).toContain("xFeedUpdate");

    unsubSchedule();
    unsubStream();
    unsubXFeed();
    ws.destroy();
  }, 20000);

  test("xFeedUpdate replaces Nitter placeholders", () => {
    const ws = new NeuroInfoApiWebsocketClient(API_TOKEN, {
      baseUrl: WS_BASE,
      autoHeartbeat: false,
    });
    const placeholder = "https://nitter.invalid";
    ws.nitterHost = "https://nitter.example";

    let received: XFeedUpdateData | undefined;
    let timestamp: number | undefined;
    const unsub = ws.on("xFeedUpdate", (data, eventTimestamp) => {
      received = data;
      timestamp = eventTimestamp;
    });

    (ws as any).handleParsedMessage({
      type: "event",
      data: {
        eventType: "xFeedUpdate",
        timestamp: 123,
        eventData: {
          user: "Vedal987",
          metadata: { placeholders: { nitterHost: placeholder } },
          entries: [
            {
              id: "1",
              type: "tweet",
              author: { username: "Vedal987" },
              url: `${placeholder}/Vedal987/status/1`,
              createdTimestamp: 123,
              rawContent: `<a href="${placeholder}/Vedal987/status/1">post</a>`,
              media: [
                {
                  type: "video",
                  url: `${placeholder}/video/1`,
                  posterUrl: `${placeholder}/poster/1`,
                },
              ],
            },
          ],
        },
      },
    });

    expect(timestamp).toBe(123);
    expect(received?.entries[0].url).toBe("https://nitter.example/Vedal987/status/1");
    expect(received?.entries[0].rawContent).toContain("https://nitter.example/Vedal987/status/1");
    expect(received?.entries[0].media[0].url).toBe("https://nitter.example/video/1");
    expect(received?.entries[0].media[0]).toMatchObject({ posterUrl: "https://nitter.example/poster/1" });

    unsub();
    ws.destroy();
  });

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

    let disconnectCode: number | undefined;
    ws.on("_disconnected", (code) => {
      disconnectCode = code;
    });

    await ws.connect();
    ws.disconnect();

    expect(await waitFor(() => (disconnectCode !== undefined ? disconnectCode : undefined))).toBe(
      1000,
    );
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
