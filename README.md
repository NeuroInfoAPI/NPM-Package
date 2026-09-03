# neuroinfoapi-client

A comprehensive TypeScript/JavaScript client that provides full access to NeuroInfoAPI endpoints with proper type definitions.

## Features

- Authentication support via Bearer token handling
- Optional token directly in `NeuroInfoApiClient` constructor
- Configurable API base URL via client options
- Full TypeScript support with typed API responses
- Timeout protection (10s default)
- Type-safe error handling via `{ data, error }` result pattern
- `NeuroInfoApiEventer` for polling-based updates (deprecated)
- `NeuroInfoApiWebsocketClient` for real-time updates with auto reconnect

## Installation

```bash
npm install neuroinfoapi-client
```

## Quick Start

```ts
import { NeuroInfoApiClient } from "neuroinfoapi-client";

// Optional token can be passed directly in the constructor
const client = new NeuroInfoApiClient("your-api-token-here");

const { data, error } = await client.getCurrentStream();

if (error) {
  console.error(`Error ${error.code}: ${error.message}`);
} else {
  console.log(data);
}
```

## Client Configuration

Constructor signature:

```ts
new NeuroInfoApiClient(token?: string, options?: NeuroInfoApiClientOptions)
```

`NeuroInfoApiClientOptions` supports:

| Option | Default | Description |
| --- | --- | --- |
| `apiBaseUrl` | `neuro.appstun.net/api/v2` | API host and path without a protocol |
| `useTls` | `true` | Use HTTPS when `true`, HTTP when `false` |
| `requestTimeoutMs` | `10000` | HTTP request timeout in milliseconds |

The legacy `baseUrl` option is deprecated and will be removed in a future major version.

Examples:

```ts
import { NeuroInfoApiClient } from "neuroinfoapi-client";

// 1) No token in constructor (set later)
const clientA = new NeuroInfoApiClient();
clientA.setApiToken("your-api-token-here");

// 2) Token in constructor
const clientB = new NeuroInfoApiClient("your-api-token-here");

// 3) Custom API URL (self-hosted or staging)
const clientC = new NeuroInfoApiClient("your-api-token-here", {
  apiBaseUrl: "your-domain.example/api/v2",
  useTls: true,
  requestTimeoutMs: 15000,
});
```

## Browser Usage

```ts
import { NeuroInfoApiClient, NeuroInfoApiWebsocketClient } from "neuroinfoapi-client";

const client = new NeuroInfoApiClient();
client.setApiToken("your-api-token-here");

// Browser-safe default uses ticket auth (no token in WS URL)
const wsClient = new NeuroInfoApiWebsocketClient("your-api-token-here");
await wsClient.connect();
```

For browsers, keep `authMethod` as the default (`"ticket"`).

## Error Handling

All HTTP API request methods return a result object with either `data` or `error`:

```ts
const { data, error } = await client.getCurrentStream();

if (error) {
  // error is NeuroApiError with code, message, and optional status
  console.log(`Error ${error.code}: ${error.message}`);
  return;
}

// data is TwitchStreamState. Live-only fields are available after narrowing.
if (data.isLive) {
  console.log(data.title);
} else {
  console.log("Stream is offline");
}
```

## HTTP API Methods

All methods below return `Promise<ApiResult<T>>`:

- `getCurrentStream()` — current Twitch stream state
- `getAllVods()` — all Twitch VODs
- `getVod(id)` — a VOD by stream ID
- `getSchedule(week, year?)` — schedule for a specific week and optional year
- `getLatestSchedule()` — latest schedule
- `getScheduleWeeks()` — available schedule weeks grouped by year
- `getDevstreamTimes()` — devstream schedule timestamps
- `getScheduleSearch(query, options?)` — search schedules with filters and cursor pagination
- `getCurrentSubathons()` — currently active subathons
- `getSubathon(year)` — subathon data for a year
- `getSubathonYears()` — available subathon years
- `getBlogFeed(raw?)` — Neuro-sama blog feed; requires an API token
- `getXFeed(user)` — cached X feed for `NeurosamaAI`, `EvilNeuroAI`, or `Vedal987`; requires an API token

## Schedule Search Pagination

Use `getScheduleSearch` and continue with `nextCursor`.
Optional filter: `type` (`normal`, `offline`, `canceled`, `TBD`, `unknown`).

`/schedule/search` has rate limits (`6 requests/minute` and `2 requests/10 seconds` per token), so avoid tight loops.

```ts
const firstPage = await client.getScheduleSearch("karaoke", { limit: 5, sort: "desc", type: "normal" });
if (firstPage.error) {
  console.error(firstPage.error.code, firstPage.error.message);
} else {
  console.log("matches:", firstPage.data.results.length);

  if (firstPage.data.nextCursor) {
    const secondPage = await client.getScheduleSearch("karaoke", {
      limit: 5,
      sort: "desc",
      cursor: firstPage.data.nextCursor,
    });
    console.log("next page:", secondPage.data?.results.length ?? 0);
  }
}
```

## Event System (Deprecated)

`NeuroInfoApiEventer` is deprecated in favor of `NeuroInfoApiWebsocketClient`.

```ts
import { NeuroInfoApiEventer } from "neuroinfoapi-client";

const eventer = new NeuroInfoApiEventer();
eventer.setApiToken("your-api-token-here");

eventer.on("streamOnline", (stream) => {
  console.log(`${stream.title} is now live!`);
});

eventer.on(
  "scheduleUpdate",
  (schedule) => console.log(`New schedule for week ${schedule.week}`),
  (error) => console.log(`Failed to fetch schedule: ${error.code}`),
);

// Default: 60s, minimum: 10s
eventer.fetchInterval = 30000;
eventer.startEventLoop();
```

Available events: `streamOnline`, `streamOffline`, `streamUpdate`, `scheduleUpdate`, `subathonUpdate`, `subathonGoalUpdate`

## WebSocket Client

Constructor signature:

```ts
new NeuroInfoApiWebsocketClient(token: string, options?: NeuroInfoApiWebsocketClientOptions)
```

The options include `apiBaseUrl`, `useTls`, `websocketUrl`, `authMethod`, `autoReconnect`, `maxReconnectAttempts`, `reconnectBaseDelay`, `autoHeartbeat`, `heartbeatIntervalMs`, `heartbeatTimeoutMs`, and `connectTimeoutMs`. The legacy WebSocket `baseUrl` option is deprecated; use `websocketUrl` for a full URL override.

```ts
import { NeuroInfoApiWebsocketClient } from "neuroinfoapi-client";

const wsClient = new NeuroInfoApiWebsocketClient("your-api-token-here");

wsClient.on("_connected", (sessionId) => {
  console.log("Connected with session:", sessionId);
});

wsClient.on("_eventAdded", (eventType) => {
  console.log("Subscribed:", eventType);
});

wsClient.on("_eventRemoved", (eventType) => {
  console.log("Unsubscribed:", eventType);
});

wsClient.on("streamOnline", (stream) => {
  console.log("Stream online:", stream.title);
});

await wsClient.connect();
```

Available WebSocket events:

- `streamOnline`
- `streamOffline`
- `streamUpdate`
- `secretneuroaccountOnline`
- `streamRaidIncoming`
- `streamRaidOutgoing`
- `scheduleUpdate`
- `subathonUpdate`
- `subathonGoalUpdate`
- `blogFeedUpdate`
- `xFeedNewEntries`
- `xFeedUpdate` (deprecated alias for `xFeedNewEntries`)

**Heartbeat:** While connected, the client periodically sends a JSON `ping` and expects a `pong` from the server (default interval **30s**, pong timeout **10s**). If the pong is missing, the socket is closed and automatic reconnect runs—this detects stale or half-open connections. Disable or tune via constructor options: `autoHeartbeat`, `heartbeatIntervalMs` (minimum 5000), `heartbeatTimeoutMs` (minimum 1000). Keep the ping interval below the server WebSocket idle timeout if you self-host with aggressive idle limits.

## Documentation

- API docs: https://neuro.appstun.net/api/docs

## License

MIT
