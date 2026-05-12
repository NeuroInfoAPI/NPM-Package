> [!NOTE]
> **The axios version does not get any updates anymore.** See [master branch](https://github.com/NeuroInfoAPI/NPM-Package/tree/master) for current version. <br>
> *Also somehow the heartbeat for the WebSocket client got removed in the latest commit. Use [this commit](https://github.com/NeuroInfoAPI/NPM-Package/commit/979bc32e9ae68625d986f4645f269402ef758f46) instead.*

# neuroinfoapi-client

TypeScript/JavaScript client for the NeuroInfoAPI.

A comprehensive TypeScript client that provides full access to NeuroInfoAPI endpoints with proper type definitions.

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
new NeuroInfoApiClient(token?: string, options?: { baseUrl?: string })
```

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
  baseUrl: "https://your-domain.example/api/v1",
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

All client methods return a result object with either `data` or `error`:

```ts
const { data, error } = await client.getCurrentStream();

if (error) {
  // error is NeuroApiError with code, message, and optional status
  console.log(`Error ${error.code}: ${error.message}`);
  return;
}

// TypeScript knows data is TwitchStreamData here
console.log(data.title);
```

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

By default, the WebSocket client uses ticket-based authentication (`GET /api/ws/ticket`) before connecting, avoiding API tokens in URL query parameters.

## Documentation

- API docs: https://neuro.appstun.net/api/docs

## License

MIT
