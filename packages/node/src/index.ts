import { NeuroInfoApiWebsocketClient as SharedWebsocketClient } from "@neuroinfoapi-client/core";
import type { WSController as SharedWSController, NeuroInfoApiWebsocketClientOptions } from "@neuroinfoapi-client/core";
import { WSController } from "./WSController.js";

export * from "@neuroinfoapi-client/core";

export class NeuroInfoApiWebsocketClient extends SharedWebsocketClient {
  constructor(token: string, options: NeuroInfoApiWebsocketClientOptions = {}) {
    super(token, {
      ...options,
      authMethod: options.authMethod ?? "header",
    });
  }

  /** Native-only timing option. Ignored here; server-ping monitoring uses a fixed 90-second timeout. */
  public override get heartbeatIntervalMs(): number { return 60000; }
  public override set heartbeatIntervalMs(_value: number) {}

  /** Native-only timing option. Ignored here, including assignments after connecting. */
  public override get heartbeatTimeoutMs(): number { return 30000; }
  public override set heartbeatTimeoutMs(_value: number) {}

  protected createWSController(url: string, headers?: Record<string, string>): SharedWSController {
    return new WSController(url, headers);
  }
}
