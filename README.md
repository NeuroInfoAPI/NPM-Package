# NeuroInfoAPI clients

A comprehensive TypeScript/JavaScript client that provides full access to NeuroInfoAPI endpoints with proper type definitions.

## Runtime packages

To take advantage of the different runtime, the client is now split into three separate packages.
`@neuroinfoapi-client/native` is the same as the old `neuroinfoapi-client` package. From the outside all the packages work the same and have the same things.

Overview WebSocket support in packages:
| Package                                                  | Runtime       | WebSocket implementation    | Default WS authentication |
| -------------------------------------------------------- | ------------- | --------------------------- | ------------------------- |
| [@neuroinfoapi-client/native](packages/native/README.md) | Browser / any | Uses Standard WebSocket API | Ticket                    |
| [@neuroinfoapi-client/node](packages/node/README.md)     | Node.js / Bun | Via `ws` npm package        | Header                    |
| [@neuroinfoapi-client/bun](packages/bun/README.md)       | Bun           | Uses native Bun WebSocket   | Header                    |

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
npm install @neuroinfoapi-client/native
# or
npm install @neuroinfoapi-client/node
# or
npm install @neuroinfoapi-client/bun
```

## Examples

For the examples see the respective package READMEs.
- [@neuroinfoapi-client/native](packages/native/README.md#browser-usage)
- [@neuroinfoapi-client/node](packages/node/README.md#nodejs-usage)
- [@neuroinfoapi-client/bun](packages/bun/README.md#bun-usage)

## Documentation

- API docs: https://neuro.appstun.net/api/docs

## License

MIT
