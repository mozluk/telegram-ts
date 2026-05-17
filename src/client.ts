import { EventsResource } from "./events.js";
import { FilesResource } from "./files.js";
import { MessagesResource } from "./messages.js";
import type { ClientOptions } from "./options.js";
import { createTransport, type Transport } from "./transport.js";

export interface TelegramClient {
  /** Idempotent. */
  close(): Promise<void>;
  readonly events: EventsResource;
  readonly files: FilesResource;
  readonly messages: MessagesResource;
}

export function createClient(opts: ClientOptions): TelegramClient {
  validateOptions(opts);
  const transport: Transport = createTransport(opts);
  return {
    events: new EventsResource(transport, opts.reconnect),
    messages: new MessagesResource(transport),
    files: new FilesResource(transport),
    close: () => transport.close(),
  };
}

function validateOptions(opts: ClientOptions): void {
  if (!opts.botToken) {
    throw new TypeError("createClient: missing required option: botToken");
  }
}
