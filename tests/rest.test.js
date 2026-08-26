import { describe, expect, test } from "bun:test";
import { NeuroApiError } from "../dist/index.js";
import { assertDeepEqual, assertResultsMatch, fetchDirect, fetchDirectResult } from "./helpers/direct-api.ts";
import { assertBlogFeedData, assertScheduleLatestResponse, assertScheduleResponse, assertSubathonData, assertTwitchStreamData, assertTwitchVod, assertXFeedData, } from "./helpers/validators.ts";
import { createClient, expectFailure, expectSuccess } from "./setup.ts";
const X_FEED_ACCOUNTS = ["NeurosamaAI", "EvilNeuroAI", "Vedal987"];
describe("NeuroInfoApiClient REST", () => {
    const client = createClient();
    test("getCurrentStream matches direct API and shape", async () => {
        const result = await client.getCurrentStream();
        const data = expectSuccess(result);
        const direct = await fetchDirect("/twitch/stream");
        assertTwitchStreamData(data);
        assertDeepEqual(data, direct, "getCurrentStream");
    }, 15000);
    test("getAllVods matches direct API and shape", async () => {
        const result = await client.getAllVods();
        const data = expectSuccess(result);
        const direct = await fetchDirect("/twitch/vods");
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
        assertTwitchVod(data[0]);
        assertDeepEqual(data, direct, "getAllVods");
    }, 15000);
    test("getVod matches direct API for first VOD", async () => {
        const vods = expectSuccess(await client.getAllVods());
        const vodId = vods[0].streamId;
        const result = await client.getVod(vodId);
        const data = expectSuccess(result);
        const direct = await fetchDirect("/twitch/vod", { id: vodId });
        assertTwitchVod(data);
        assertDeepEqual(data, direct, "getVod");
    }, 15000);
    test("getLatestSchedule matches direct API and shape", async () => {
        const result = await client.getLatestSchedule();
        const data = expectSuccess(result);
        const direct = await fetchDirect("/schedule/latest");
        assertScheduleLatestResponse(data);
        assertDeepEqual(data, direct, "getLatestSchedule");
    }, 15000);
    test("getSchedule matches direct API for latest week", async () => {
        const latest = expectSuccess(await client.getLatestSchedule());
        const result = await client.getSchedule(latest.week, latest.year);
        const data = expectSuccess(result);
        const direct = await fetchDirect("/schedule", { week: latest.week, year: latest.year });
        assertScheduleResponse(data);
        assertDeepEqual(data, direct, "getSchedule");
    }, 15000);
    test("getScheduleWeeks matches direct API", async () => {
        const result = await client.getScheduleWeeks();
        const data = expectSuccess(result);
        const direct = await fetchDirect("/schedule/weeks");
        expect(typeof data).toBe("object");
        for (const [year, weeks] of Object.entries(data)) {
            expect(Number.isFinite(Number(year))).toBe(true);
            expect(Array.isArray(weeks)).toBe(true);
            for (const week of weeks)
                expect(typeof week).toBe("number");
        }
        assertDeepEqual(data, direct, "getScheduleWeeks");
    }, 15000);
    test("getDevstreamTimes matches direct API", async () => {
        const result = await client.getDevstreamTimes();
        const data = expectSuccess(result);
        const direct = await fetchDirect("/devstream/times");
        expect(Array.isArray(data)).toBe(true);
        for (const time of data)
            expect(typeof time).toBe("number");
        assertDeepEqual(data, direct, "getDevstreamTimes");
    }, 15000);
    test("getScheduleSearch matches direct API", async () => {
        const result = await client.getScheduleSearch("stream", { limit: 3, sort: "desc" });
        const data = expectSuccess(result);
        const direct = await fetchDirect("/schedule/search", {
            query: "stream",
            limit: 3,
            sort: "desc",
        });
        expect(Array.isArray(data.results)).toBe(true);
        expect(data.results.length).toBeLessThanOrEqual(3);
        if (data.nextCursor) {
            expect(typeof data.nextCursor.year).toBe("number");
            expect(typeof data.nextCursor.week).toBe("number");
        }
        assertDeepEqual(data, direct, "getScheduleSearch");
    }, 15000);
    test("getCurrentSubathons matches direct API and shape", async () => {
        const result = await client.getCurrentSubathons();
        const direct = await fetchDirectResult("/subathon");
        assertResultsMatch(result, direct, "getCurrentSubathons");
        if (result.data) {
            expect(Array.isArray(result.data)).toBe(true);
            for (const subathon of result.data) {
                assertSubathonData(subathon);
            }
        }
    }, 15000);
    test("getSubathonYears matches direct API", async () => {
        const result = await client.getSubathonYears();
        const data = expectSuccess(result);
        const direct = await fetchDirect("/subathon/years");
        expect(typeof data).toBe("object");
        for (const [year, name] of Object.entries(data)) {
            expect(Number.isFinite(Number(year))).toBe(true);
            expect(typeof name).toBe("string");
        }
        assertDeepEqual(data, direct, "getSubathonYears");
    }, 15000);
    test("getSubathon matches direct API for available year", async () => {
        const years = expectSuccess(await client.getSubathonYears());
        const year = Number(Object.keys(years)[0]);
        const result = await client.getSubathon(year);
        const data = expectSuccess(result);
        const direct = await fetchDirect("/subathon", { year });
        assertSubathonData(data);
        assertDeepEqual(data, direct, "getSubathon");
    }, 15000);
    test("getBlogFeed matches direct API and shape", async () => {
        const result = await client.getBlogFeed();
        const data = expectSuccess(result);
        const direct = await fetchDirect("/blog");
        assertBlogFeedData(data);
        assertDeepEqual(data, direct, "getBlogFeed");
    }, 15000);
    test("getBlogFeed raw matches direct API", async () => {
        const result = await client.getBlogFeed(true);
        const data = expectSuccess(result);
        const direct = await fetchDirect("/blog", { raw: true });
        assertBlogFeedData(data, true);
        assertDeepEqual(data, direct, "getBlogFeed(raw)");
    }, 15000);
    test("getXFeed matches direct API and shape", async () => {
        for (const user of X_FEED_ACCOUNTS) {
            const data = expectSuccess(await client.getXFeed(user));
            const direct = await fetchDirect("/x-feed", { user });
            assertXFeedData(data);
            assertDeepEqual(data.entries, direct, `getXFeed(${user})`);
        }
    }, 15000);
    test("getXFeed raw replaces Nitter placeholders", async () => {
        const nitterHost = "https://nitter.example";
        const data = expectSuccess(await client.getXFeed("NeurosamaAI", true, nitterHost));
        const placeholder = data.metadata.placeholders.nitterHost;
        assertXFeedData(data, true);
        const urls = data.entries.flatMap((entry) => [
            entry.url,
            ...(entry.rawContent ? [entry.rawContent] : []),
            ...entry.media.flatMap((media) => [
                media.url,
                ...(media.type === "video" && media.posterUrl ? [media.posterUrl] : []),
            ]),
        ]);
        expect(urls.some((url) => url.includes(nitterHost))).toBe(true);
        for (const url of urls)
            expect(url.includes(placeholder)).toBe(false);
    }, 15000);
    test("setApiToken updates client auth header", async () => {
        const tokenless = createClient(undefined);
        const withToken = createClient();
        const publicResult = await tokenless.getCurrentStream();
        const authedResult = await withToken.getCurrentStream();
        expectSuccess(publicResult);
        expectSuccess(authedResult);
        assertDeepEqual(publicResult.data, authedResult.data, "setApiToken/public");
        const { API_TOKEN } = await import("./setup.ts");
        tokenless.setApiToken(API_TOKEN);
        const afterSet = await tokenless.getCurrentStream();
        expectSuccess(afterSet);
        assertDeepEqual(afterSet.data, authedResult.data, "setApiToken/afterSet");
        tokenless.setApiToken(null);
        const afterClear = await tokenless.getCurrentStream();
        expectSuccess(afterClear);
    }, 15000);
    test("invalid VOD id returns NeuroApiError", async () => {
        const result = await client.getVod("000000000000000000000000");
        const error = expectFailure(result);
        expect(error).toBeInstanceOf(NeuroApiError);
        expect(typeof error.code).toBe("string");
        expect(typeof error.message).toBe("string");
    }, 15000);
});
