import { wrapGrpcError } from "./errors.js";
import { mapProtoEvent } from "./event-mapper.js";
import type {
  ReconnectOptions,
  ReplayOptions,
  SubscribeOptions,
} from "./options.js";
import { TypedEventStream } from "./stream.js";
import type { Transport } from "./transport.js";
import type { TelegramEvent } from "./types.js";

const DEFAULT_RECONNECT: Required<Omit<ReconnectOptions, "onReconnect">> = {
  initialDelayMs: 500,
  maxDelayMs: 30_000,
  multiplier: 2,
  maxAttempts: Number.POSITIVE_INFINITY,
};

export class EventsResource {
  private readonly transport: Transport;
  private readonly defaultReconnect: ReconnectOptions | undefined;

  constructor(transport: Transport, defaultReconnect?: ReconnectOptions) {
    this.transport = transport;
    this.defaultReconnect = defaultReconnect;
  }

  /**
   * Subscribe to inbound events. Returns a `TypedEventStream` you iterate with
   * `for await ... of`. The stream auto-reconnects with full-jitter backoff
   * and resumes from the last delivered cursor.
   */
  subscribe(opts: SubscribeOptions = {}): TypedEventStream<TelegramEvent> {
    const controller = new AbortController();
    const externalSignal = opts.signal;
    const signal = mergeSignals(controller.signal, externalSignal);
    const policy = mergeReconnect(opts.reconnect ?? this.defaultReconnect);
    const transport = this.transport;
    let lastCursor = opts.fromCursor;

    const source: AsyncIterable<TelegramEvent> = {
      [Symbol.asyncIterator]: () =>
        subscribeIterator({
          transport,
          getLastCursor: () => lastCursor,
          setLastCursor: (c) => {
            lastCursor = c;
          },
          signal,
          policy,
        }),
    };

    return new TypedEventStream<TelegramEvent>(source, () => {
      controller.abort();
      return Promise.resolve();
    });
  }

  /**
   * Bounded historical replay between two cursors. Stream ends when the range
   * is drained — no reconnect, no live attach.
   */
  replay(opts: ReplayOptions): TypedEventStream<TelegramEvent> {
    const controller = new AbortController();
    const signal = mergeSignals(controller.signal, opts.signal);
    const transport = this.transport;

    const source: AsyncIterable<TelegramEvent> = {
      async *[Symbol.asyncIterator]() {
        const stream = transport.bot.replay(
          {
            fromCursor: opts.fromCursor,
            ...(opts.untilCursor === undefined
              ? {}
              : { untilCursor: opts.untilCursor }),
            ...(opts.limit === undefined ? {} : { limit: opts.limit }),
          },
          {
            metadata: transport.metadata(),
            signal,
          }
        );
        try {
          for await (const protoEvt of stream) {
            const evt = mapProtoEvent(protoEvt);
            if (evt) {
              yield evt;
            }
          }
        } catch (err) {
          if (signal.aborted) {
            return;
          }
          throw wrapGrpcError(err);
        }
      },
    };

    return new TypedEventStream<TelegramEvent>(source, () => {
      controller.abort();
      return Promise.resolve();
    });
  }
}

interface SubscribeContext {
  getLastCursor: () => number | undefined;
  policy: Required<Omit<ReconnectOptions, "onReconnect">> & {
    onReconnect?: ReconnectOptions["onReconnect"];
  };
  setLastCursor: (cursor: number) => void;
  signal: AbortSignal;
  transport: Transport;
}

async function* subscribeIterator(
  ctx: SubscribeContext
): AsyncGenerator<TelegramEvent, void, unknown> {
  let attempt = 0;
  while (!ctx.signal.aborted) {
    try {
      for await (const evt of openOnce(
        ctx.transport,
        ctx.getLastCursor(),
        ctx.signal
      )) {
        if (evt.type !== "heartbeat") {
          ctx.setLastCursor(evt.cursor);
        }
        yield evt;
      }
      attempt = 0;
    } catch (err) {
      if (ctx.signal.aborted) {
        return;
      }
      const wrapped = err instanceof Error ? err : new Error(String(err));
      attempt += 1;
      if (attempt > ctx.policy.maxAttempts) {
        throw wrapped;
      }
      ctx.policy.onReconnect?.(attempt, wrapped);
      await sleep(backoff(ctx.policy, attempt), ctx.signal);
    }
  }
}

async function* openOnce(
  transport: Transport,
  fromCursor: number | undefined,
  signal: AbortSignal
): AsyncIterable<TelegramEvent> {
  const stream = transport.bot.subscribe(
    fromCursor === undefined ? {} : { fromCursor },
    {
      metadata: transport.metadata(),
      signal,
    }
  );
  try {
    for await (const protoEvt of stream) {
      const evt = mapProtoEvent(protoEvt);
      if (evt) {
        yield evt;
      }
    }
  } catch (err) {
    throw wrapGrpcError(err);
  }
}

function mergeSignals(
  primary: AbortSignal,
  secondary: AbortSignal | undefined
): AbortSignal {
  if (!secondary) {
    return primary;
  }
  const combined = new AbortController();
  const onAbort = () => combined.abort();
  if (primary.aborted || secondary.aborted) {
    combined.abort();
  } else {
    primary.addEventListener("abort", onAbort, { once: true });
    secondary.addEventListener("abort", onAbort, { once: true });
  }
  return combined.signal;
}

function mergeReconnect(user: ReconnectOptions | undefined): Required<
  Omit<ReconnectOptions, "onReconnect">
> & {
  onReconnect?: ReconnectOptions["onReconnect"];
} {
  if (!user) {
    return { ...DEFAULT_RECONNECT };
  }
  return {
    initialDelayMs: user.initialDelayMs ?? DEFAULT_RECONNECT.initialDelayMs,
    maxDelayMs: user.maxDelayMs ?? DEFAULT_RECONNECT.maxDelayMs,
    multiplier: user.multiplier ?? DEFAULT_RECONNECT.multiplier,
    maxAttempts: user.maxAttempts ?? DEFAULT_RECONNECT.maxAttempts,
    ...(user.onReconnect ? { onReconnect: user.onReconnect } : {}),
  };
}

function backoff(
  policy: { initialDelayMs: number; maxDelayMs: number; multiplier: number },
  attempt: number
): number {
  const raw = policy.initialDelayMs * policy.multiplier ** (attempt - 1);
  const jittered = Math.random() * raw;
  return Math.min(jittered, policy.maxDelayMs);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new Error("aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
