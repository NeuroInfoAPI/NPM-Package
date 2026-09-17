/** One controller per connection. Protocol/reconnect logic stays in the shared client. */
export interface WSController extends Pick<WebSocket, "readyState" | "close" | "addEventListener" | "removeEventListener"> {
  /** The shared client sends JSON text messages. */
  send(data: string): void;
  readonly heartbeatMode: "json" | "server-ping";
  /** Call for incoming protocol pings only. The underlying socket answers with pong. */
  onPing: (() => void) | null;
  /** Abort immediately where supported; native WebSocket falls back to close(). */
  terminate(code: number, reason: string): void;
}
