import type { WSController as SharedWSController } from "@neuroinfoapi-client/core";

export class WSController implements SharedWSController {
  readonly heartbeatMode = "server-ping";
  onPing: (() => void) | null = null;
  private readonly socket: Bun.WebSocket;

  constructor(url: string, headers?: Record<string, string>) {
    // lib.dom hides Bun's extended global constructor when both type sets are loaded.
    const BunWebSocket = globalThis.WebSocket as unknown as {
      new (url: string, options: Bun.WebSocketOptions): Bun.WebSocket;
    };
    this.socket = new BunWebSocket(url, { headers });
    // Bun automatically answers protocol pings; only refresh the shared watchdog.
    this.socket.addEventListener("ping", () => this.onPing?.());
  }

  get readyState(): WebSocket["readyState"] { return this.socket.readyState; }
  send(data: string): void { this.socket.send(data); }
  close(code?: number, reason?: string): void { this.socket.close(code, reason); }
  terminate(_code: number, _reason: string): void { this.socket.terminate(); }

  addEventListener: WebSocket["addEventListener"] = (type: any, listener: any, options?: any) => {
    this.socket.addEventListener(type, listener, options);
  };
  removeEventListener: WebSocket["removeEventListener"] = (type: any, listener: any, options?: any) => {
    this.socket.removeEventListener(type, listener, options);
  };
}
