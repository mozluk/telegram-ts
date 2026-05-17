export interface ClientOptions {
  /** Telegram bot token (e.g. "12345:AAH..."). Sent on every RPC; never persisted by the transport. */
  botToken: string;
  /**
   * Hostname or full URL. `https://...` enables TLS. Falls back to
   * `SPECTRUM_TELEGRAM_ENDPOINT` env var, then to a built-in default.
   */
  endpoint?: string;
  reconnect?: ReconnectOptions;
}

export interface ReconnectOptions {
  /** Default 500. */
  initialDelayMs?: number;
  /** Default Infinity. */
  maxAttempts?: number;
  /** Default 30_000. */
  maxDelayMs?: number;
  /** Default 2. */
  multiplier?: number;
  onReconnect?: (attempt: number, lastError: Error | undefined) => void;
}

export interface SubscribeOptions {
  /** Resume from this cursor (Telegram update_id). */
  fromCursor?: number;
  reconnect?: ReconnectOptions;
  signal?: AbortSignal;
}

export interface ReplayOptions {
  fromCursor: number;
  /** Server default 1000, max 10000. */
  limit?: number;
  signal?: AbortSignal;
  /** Inclusive. Omit for end-of-log. */
  untilCursor?: number;
}

/**
 * Outbound media reference. Set exactly one of:
 * - `fileId` — reuse a file already on Telegram's servers (cheapest).
 * - `url`    — public URL Telegram fetches.
 * - `data`   — raw bytes; the transport uploads it via multipart.
 */
export interface MediaInput {
  caption?: string;
  data?: Uint8Array;
  fileId?: string;
  /** Documents only. */
  filename?: string;
  mimeType?: string;
  url?: string;
}

export interface LocationInput {
  /** When set, sendVenue is used; address is required. */
  address?: string;
  latitude: number;
  longitude: number;
  title?: string;
}

export interface ContactInput {
  firstName: string;
  lastName?: string;
  phoneNumber: string;
  vcard?: string;
}

export interface PollInput {
  /** Regular polls only. Default false. */
  allowsMultipleAnswers?: boolean;
  /** Quiz polls only; 0-based index of the correct option. */
  correctOptionId?: number;
  /** Quiz polls only; shown after the user answers (0..200 chars). */
  explanation?: string;
  /** Default true. */
  isAnonymous?: boolean;
  /** 5..600 sec. Mutually exclusive with the absent close_date. */
  openPeriod?: number;
  /** 2..10 strings, each 1..100 chars. */
  options: string[];
  /** 1..300 chars. */
  question: string;
  /** Default "regular". */
  type?: "regular" | "quiz";
}

/**
 * Generic attachment input — typically built via the `attachment()` helper.
 * The SDK auto-routes to the right typed send based on `mimeType`:
 *   - image/* → photo (image/gif → document; Telegram has no native gif send)
 *   - video/* → video
 *   - audio/* → audio
 *   - everything else → document
 * Use `voice()` (or the explicit `voice` send option) for voice notes.
 */
export interface AttachmentInput {
  caption?: string;
  data: Uint8Array;
  filename?: string;
  mimeType: string;
}

export interface LinkPreviewOptions {
  isDisabled?: boolean;
  preferLargeMedia?: boolean;
  preferSmallMedia?: boolean;
  /** Show the preview above the message text instead of below. */
  showAboveText?: boolean;
  /** Render the preview for this URL instead of the first one in the text. */
  url?: string;
}

interface SendCommon {
  chatId: string;
  /** Forwarded straight to the Bot API method body. Strings only. */
  params?: Record<string, string>;
  replyToMessageId?: string;
}

export type SendOptions =
  | (SendCommon & { text: string; linkPreviewOptions?: LinkPreviewOptions })
  | (SendCommon & { photo: MediaInput })
  | (SendCommon & { video: MediaInput })
  | (SendCommon & { audio: MediaInput })
  | (SendCommon & { voice: MediaInput })
  | (SendCommon & { document: MediaInput })
  | (SendCommon & { sticker: Omit<MediaInput, "caption"> })
  | (SendCommon & { location: LocationInput })
  | (SendCommon & { contact: ContactInput })
  | (SendCommon & { poll: PollInput })
  | (SendCommon & { attachment: AttachmentInput });

export type GroupItemInput =
  | { audio: MediaInput }
  | { document: MediaInput }
  | { photo: MediaInput }
  | { video: MediaInput }
  | { attachment: AttachmentInput };

export interface SendGroupOptions {
  chatId: string;
  /** 2..10 items. Either {photo|video} mixed, all-audio, or all-document. */
  items: GroupItemInput[];
  params?: Record<string, string>;
  replyToMessageId?: string;
}

export interface EditOptions {
  chatId: string;
  linkPreviewOptions?: LinkPreviewOptions;
  messageId: string;
  params?: Record<string, string>;
  text: string;
}

export type EditMediaOptions = {
  chatId: string;
  messageId: string;
  params?: Record<string, string>;
} & (
  | { photo: MediaInput }
  | { video: MediaInput }
  | { audio: MediaInput }
  | { document: MediaInput }
  | { attachment: AttachmentInput }
);

export interface EditCaptionOptions {
  /** Empty string clears the caption. */
  caption: string;
  chatId: string;
  messageId: string;
  params?: Record<string, string>;
}

export interface DeleteOptions {
  chatId: string;
  messageId: string;
}

export interface ReactOptions {
  chatId: string;
  emoji: string[];
  isBig?: boolean;
  messageId: string;
}

export type ChatActionName =
  | "typing"
  | "upload_photo"
  | "record_video"
  | "upload_video"
  | "record_voice"
  | "upload_voice"
  | "upload_document"
  | "choose_sticker"
  | "find_location"
  | "record_video_note"
  | "upload_video_note";

export interface SendChatActionOptions {
  /** Telegram Bot API chat action string. */
  action: ChatActionName;
  /** For Telegram Business connections. */
  businessConnectionId?: string;
  chatId: string;
  /** Forum topic thread, when applicable. */
  messageThreadId?: number;
}

export interface MarkBusinessReadOptions {
  /** From the `business_connection` update on Subscribe. Required by Telegram. */
  businessConnectionId: string;
  chatId: string;
  messageId: string;
}
