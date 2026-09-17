import { NeuroInfoApiWebsocketClient as SharedWebsocketClient } from "@neuroinfoapi-client/core";
import type { WSController as SharedWSController } from "@neuroinfoapi-client/core";
import { WSController } from "./WSController.js";

export * from "@neuroinfoapi-client/core";

export class NeuroInfoApiWebsocketClient extends SharedWebsocketClient {
  protected createWSController(url: string, headers?: Record<string, string>): SharedWSController {
    return new WSController(url, headers);
  }
}
