import WebSocket from "ws";
import type { WSController as SharedWSController } from "@neuroinfoapi-client/core";

export class WSController implements SharedWSController {
  readonly heartbeatMode = "server-ping";
  onPing: (() => void) | null = null;
  private readonly socket: WebSocket;

  constructor(url: string, headers?: Record<string, string>) {
    this.socket = new WebSocket(url, { headers });
    // ws automatically answers protocol pings with matching pong frames.
    this.socket.on("ping", () => this.onPing?.());
    // An aborted handshake can emit error after the shared client removes listeners.
    this.socket.on("error", () => {});
  }

  get readyState(): SharedWSController["readyState"] { return this.socket.readyState; }
  send(data: Parameters<SharedWSController["send"]>[0]): void { this.socket.send(data); }
  close(code?: number, reason?: string): void { this.socket.close(code, reason); }
  terminate(_code: number, _reason: string): void { this.socket.terminate(); }

  // ws's EventTarget adapter converts text frames and close reasons to strings
  // and preserves listener identities (including once and handleEvent objects).
  addEventListener: SharedWSController["addEventListener"] = (type: any, listener: any, options?: any) => {
    this.socket.addEventListener(type, listener, options);
  };
  removeEventListener: SharedWSController["removeEventListener"] = (type: any, listener: any) => {
    this.socket.removeEventListener(type, listener);
  };
}
