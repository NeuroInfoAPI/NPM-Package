import { describe, expect, test } from "bun:test";
import { NeuroInfoApiEventer } from "../dist/index.js";
import { API_TOKEN } from "./setup.ts";

describe("NeuroInfoApiEventer", () => {
  test("exposes underlying client and token management", () => {
    const eventer = new NeuroInfoApiEventer();
    const client = eventer.getClient();
    expect(client).toBeDefined();

    eventer.setApiToken(API_TOKEN);
    eventer.setApiToken(null);
    eventer.setApiToken(API_TOKEN);
  });

  test("fetchInterval enforces 10s minimum", () => {
    const eventer = new NeuroInfoApiEventer();
    eventer.fetchInterval = 1000;
    expect(eventer.fetchInterval).toBe(10000);
    eventer.fetchInterval = 30000;
    expect(eventer.fetchInterval).toBe(30000);
  });

  test("on/off/once/removeAllListeners lifecycle", async () => {
    const eventer = new NeuroInfoApiEventer();
    eventer.setApiToken(API_TOKEN);

    let scheduleHits = 0;
    let onceHits = 0;

    const unsub = eventer.on("scheduleUpdate", () => {
      scheduleHits += 1;
    });

    eventer.once("scheduleUpdate", () => {
      onceHits += 1;
    });

    eventer.startEventLoop();
    await new Promise((r) => setTimeout(r, 3000));
    eventer.stopEventLoop();

    expect(scheduleHits).toBeGreaterThanOrEqual(1);
    expect(onceHits).toBe(1);

    unsub();
    eventer.removeAllListeners("scheduleUpdate");
    eventer.removeAllListeners();
  }, 15000);

  test("startEventLoop is idempotent", () => {
    const eventer = new NeuroInfoApiEventer();
    eventer.startEventLoop();
    eventer.startEventLoop();
    eventer.stopEventLoop();
    eventer.stopEventLoop();
  });
});
