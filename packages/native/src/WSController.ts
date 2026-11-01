import type { WSController as SharedWSController } from "@neuroinfoapi-client/core";

export class WSController implements SharedWSController {
  readonly heartbeatMode = "json";
  onPing: (() => void) | null = null;
  private readonly socket: WebSocket;

  constructor(url: string, headers?: Record<string, string>) {
    // Preserve the legacy client's constructor variants for runtimes/polyfills
    // with header support (Node.js/Undici, Bun, or a global ws implementation).
    const RuntimeWebSocket = WebSocket as unknown as {
      new (url: string, options: { headers: Record<string, string> }): WebSocket;
      new (url: string, protocols: undefined, options: { headers: Record<string, string> }): WebSocket;
    };
    if (headers) {
      try {
        this.socket = new RuntimeWebSocket(url, { headers });
      } catch {
        this.socket = new RuntimeWebSocket(url, undefined, { headers });
      }
    } else {
      this.socket = new WebSocket(url);
    }
  }

  get readyState(): WebSocket["readyState"] { return this.socket.readyState; }

  send(data: Parameters<WebSocket["send"]>[0]): void { this.socket.send(data); }
  close(code?: number, reason?: string): void { this.socket.close(code, reason); }
  terminate(code: number, reason: string): void { this.socket.close(code, reason); }

  addEventListener: WebSocket["addEventListener"] = (type: any, listener: any, options?: any) => {
    this.socket.addEventListener(type, listener, options);
  };
  removeEventListener: WebSocket["removeEventListener"] = (type: any, listener: any, options?: any) => {
    this.socket.removeEventListener(type, listener, options);
  };
}
