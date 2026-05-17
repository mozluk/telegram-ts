# @photon-ai/telegram

TypeScript SDK for the Telegram Bot API via Photon's Spectrum gRPC gateway.

## Installation

```bash
bun add @photon-ai/telegram
```

## Quick start

```ts
import { createClient } from "@photon-ai/telegram";

const client = createClient({
  botToken: process.env.TELEGRAM_BOT_TOKEN!,
});

// Send a text message
await client.messages.send({
  chatId: "-100123456789",
  text: "Hello from the SDK!",
});

// Subscribe to inbound events
const stream = client.events.subscribe();
for await (const event of stream) {
  if (event.type === "heartbeat") continue;
  if (event.type === "message") {
    console.log(`${event.message.from?.username}: ${event.message.text}`);
  }
}

await client.close();
```

## Configuration

| Environment variable | Description | Default |
| --- | --- | --- |
| `TELEGRAM_ENDPOINT` | gRPC server address (host:port or full URL) | `telegram-grpc.spectrum.photon.codes:443` |
| `SPECTRUM_TELEGRAM_ENDPOINT` | Legacy alias for `TELEGRAM_ENDPOINT` | — |

`endpoint` accepts:
- `host:port` (plaintext, e.g. for local dev)
- `https://host[:port]` (TLS)
- `http://host[:port]` (plaintext over HTTP)

## Receiving events

`events.subscribe()` returns a `TypedEventStream` you iterate with `for await ... of`. The stream auto-reconnects with full-jitter backoff and resumes from the last delivered cursor.

```ts
const stream = client.events.subscribe({ fromCursor: lastSavedCursor });
for await (const event of stream) {
  switch (event.type) {
    case "message":
      // event.message: InboundMessage
      break;
    case "reaction":
      // event.reaction: MessageReaction
      break;
    case "poll":
    case "poll_answer":
      // event.poll / event.answer
      break;
    case "heartbeat":
      // ignore; emitted every ~30s
      break;
  }
  await saveCheckpoint(event.cursor);
}
await stream.close();
```

For bounded historical replay, use `events.replay({ fromCursor, untilCursor?, limit? })`.

## Sending messages

Beyond text, `send()` accepts `photo`, `video`, `audio`, `voice`, `document`, `sticker`, `location`, `contact`, `poll`, or `attachment`. Media may be referenced by `fileId`, `url`, or raw `data`.

```ts
await client.messages.send({
  chatId,
  photo: { url: "https://example.com/cat.jpg", caption: "look" },
});

import { attachment } from "@photon-ai/telegram";
await client.messages.send({
  chatId,
  attachment: await attachment("./photo.jpg"),
});
```

See [`bot.proto`](./proto/spectrum/telegram/v1/bot.proto) for the full surface.

## Errors

All RPC errors are wrapped in typed subclasses of `TelegramTransportError`:

- `AuthenticationError` — `UNAUTHENTICATED` / `PERMISSION_DENIED`
- `RateLimitError` — `RESOURCE_EXHAUSTED` (carries `retryAfterSec` when present)
- `NotFoundError` — `NOT_FOUND`
- `ValidationError` — `INVALID_ARGUMENT` / `FAILED_PRECONDITION`
- `UnavailableError` — `UNAVAILABLE` / `DEADLINE_EXCEEDED`

`retryable` and `grpcCode` are exposed on every instance.

## Development

```bash
bun install
bun run generate    # regenerate protobuf types from proto/
bun run build       # generate + bundle with tsup
bun run check       # type-check
bun run lint        # lint with Biome
bun test            # run tests
```

`src/_gen/` is generated from `proto/spectrum/telegram/v1/bot.proto` and is git-ignored; `bun run build` regenerates it as part of the build.

## License

MIT
