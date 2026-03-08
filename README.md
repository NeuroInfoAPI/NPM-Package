# neuroinfoapi-client

TypeScript/JavaScript client for the NeuroInfoAPI.

A comprehensive TypeScript client that provides full access to NeuroInfoAPI endpoints with proper type definitions.

## Features

- Authentication support via Bearer token handling
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

const client = new NeuroInfoApiClient();

// For endpoints requiring authentication
client.setApiToken("your-api-token-here");

const { data, error } = await client.getCurrentStream();

if (error) {
  console.error(`Error ${error.code}: ${error.message}`);
} else {
  console.log(data);
}
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
