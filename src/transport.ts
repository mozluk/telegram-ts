import { ChannelCredentials } from "@grpc/grpc-js";
import {
  type Channel,
  createChannel,
  createClient as createGrpcClient,
  Metadata,
} from "nice-grpc";
import {
  type BotClient,
  BotDefinition,
} from "./_gen/spectrum/telegram/v1/bot.js";
import type { ClientOptions } from "./options.js";

export interface Transport {
  bot: BotClient;
  close: () => Promise<void>;
  metadata: () => Metadata;
}

const DEFAULT_ENDPOINT = "telegram-grpc.spectrum.photon.codes:443";

export function createTransport(opts: ClientOptions): Transport {
  const endpoint = resolveEndpoint(opts.endpoint);
  const { target, isSecure } = parseEndpoint(endpoint);
  const creds = isSecure
    ? ChannelCredentials.createSsl()
    : ChannelCredentials.createInsecure();
  const channel: Channel = createChannel(target, creds);
  const bot = createGrpcClient(BotDefinition, channel);

  return {
    bot,
    metadata: () => buildMetadata(opts),
    close: () => {
      const c = channel as unknown as { close?: () => void };
      c.close?.();
      return Promise.resolve();
    },
  };
}

function buildMetadata(opts: ClientOptions): Metadata {
  const md = new Metadata();
  md.set("bot_token", opts.botToken);
  return md;
}

function resolveEndpoint(provided: string | undefined): string {
  if (provided) {
    return provided;
  }
  if (typeof process === "undefined") {
    return DEFAULT_ENDPOINT;
  }
  return (
    process.env?.TELEGRAM_ENDPOINT ??
    process.env?.SPECTRUM_TELEGRAM_ENDPOINT ??
    DEFAULT_ENDPOINT
  );
}

function parseEndpoint(endpoint: string): {
  target: string;
  isSecure: boolean;
} {
  if (endpoint.startsWith("https://")) {
    return { target: endpoint.slice("https://".length), isSecure: true };
  }
  if (endpoint.startsWith("http://")) {
    return { target: endpoint.slice("http://".length), isSecure: false };
  }
  return { target: endpoint, isSecure: false };
}
