import type {
  EditMediaRequest,
  Contact as ProtoContact,
  GroupItem as ProtoGroupItem,
  LinkPreviewOptions as ProtoLinkPreviewOptions,
  Location as ProtoLocation,
  Media as ProtoMedia,
  Poll as ProtoPoll,
  SendRequest,
} from "./_gen/spectrum/telegram/v1/bot.js";
import { attachmentKind } from "./attachment.js";
import { wrapGrpcError } from "./errors.js";
import type {
  AttachmentInput,
  ContactInput,
  DeleteOptions,
  EditCaptionOptions,
  EditMediaOptions,
  EditOptions,
  GroupItemInput,
  LinkPreviewOptions,
  LocationInput,
  MarkBusinessReadOptions,
  MediaInput,
  PollInput,
  ReactOptions,
  SendChatActionOptions,
  SendGroupOptions,
  SendOptions,
} from "./options.js";
import type { Transport } from "./transport.js";
import type { SendResult } from "./types.js";

export class MessagesResource {
  private readonly transport: Transport;

  constructor(transport: Transport) {
    this.transport = transport;
  }

  /**
   * Send a message. One of `text` / `photo` / `video` / `audio` / `voice` /
   * `document` / `sticker` / `location` / `contact` / `poll` / `attachment`
   * must be set on opts. Pair `attachment()` from the helper with this for the
   * one-call ergonomic.
   */
  async send(opts: SendOptions): Promise<SendResult> {
    try {
      const r = await this.transport.bot.send(buildSendRequest(opts), {
        metadata: this.transport.metadata(),
      });
      return { messageId: r.messageId, chatId: r.chatId };
    } catch (err) {
      throw wrapGrpcError(err);
    }
  }

  /** Send a media group / album. 2..10 items, all of one family. */
  async sendGroup(opts: SendGroupOptions): Promise<SendResult[]> {
    try {
      const r = await this.transport.bot.sendGroup(
        {
          chatId: opts.chatId,
          items: opts.items.map(toProtoGroupItem),
          ...(opts.replyToMessageId === undefined
            ? {}
            : { replyToMessageId: opts.replyToMessageId }),
          rawParams: opts.params ?? {},
        },
        { metadata: this.transport.metadata() }
      );
      return r.messages.map((m) => ({
        messageId: m.messageId,
        chatId: m.chatId,
      }));
    } catch (err) {
      throw wrapGrpcError(err);
    }
  }

  async edit(opts: EditOptions): Promise<SendResult> {
    try {
      const r = await this.transport.bot.edit(
        {
          chatId: opts.chatId,
          messageId: opts.messageId,
          content: { $case: "text", text: opts.text },
          ...(opts.linkPreviewOptions
            ? {
                linkPreviewOptions: toProtoLinkPreview(opts.linkPreviewOptions),
              }
            : {}),
          rawParams: opts.params ?? {},
        },
        { metadata: this.transport.metadata() }
      );
      return { messageId: r.messageId, chatId: r.chatId };
    } catch (err) {
      throw wrapGrpcError(err);
    }
  }

  /** Replace the media of an existing message (Bot API editMessageMedia). */
  async editMedia(opts: EditMediaOptions): Promise<SendResult> {
    try {
      const r = await this.transport.bot.editMedia(
        {
          chatId: opts.chatId,
          messageId: opts.messageId,
          content: pickEditMediaContent(opts),
          rawParams: opts.params ?? {},
        },
        { metadata: this.transport.metadata() }
      );
      return { messageId: r.messageId, chatId: r.chatId };
    } catch (err) {
      throw wrapGrpcError(err);
    }
  }

  /** Update only the caption. Pass an empty string to clear it. */
  async editCaption(opts: EditCaptionOptions): Promise<SendResult> {
    try {
      const r = await this.transport.bot.editCaption(
        {
          chatId: opts.chatId,
          messageId: opts.messageId,
          caption: opts.caption,
          rawParams: opts.params ?? {},
        },
        { metadata: this.transport.metadata() }
      );
      return { messageId: r.messageId, chatId: r.chatId };
    } catch (err) {
      throw wrapGrpcError(err);
    }
  }

  async delete(opts: DeleteOptions): Promise<void> {
    try {
      await this.transport.bot.delete(
        { chatId: opts.chatId, messageId: opts.messageId },
        { metadata: this.transport.metadata() }
      );
    } catch (err) {
      throw wrapGrpcError(err);
    }
  }

  async react(opts: ReactOptions): Promise<void> {
    try {
      await this.transport.bot.react(
        {
          chatId: opts.chatId,
          messageId: opts.messageId,
          emoji: opts.emoji,
          isBig: opts.isBig ?? false,
        },
        { metadata: this.transport.metadata() }
      );
    } catch (err) {
      throw wrapGrpcError(err);
    }
  }

  /**
   * Send a chat action ("typing", "upload_photo", etc.). Best-effort hint
   * shown to users for ~5 seconds; resend periodically for longer operations.
   */
  async sendChatAction(opts: SendChatActionOptions): Promise<void> {
    try {
      await this.transport.bot.sendChatAction(
        {
          chatId: opts.chatId,
          action: opts.action,
          ...(opts.businessConnectionId === undefined
            ? {}
            : { businessConnectionId: opts.businessConnectionId }),
          ...(opts.messageThreadId === undefined
            ? {}
            : { messageThreadId: opts.messageThreadId }),
        },
        { metadata: this.transport.metadata() }
      );
    } catch (err) {
      throw wrapGrpcError(err);
    }
  }

  /**
   * Mark a message as read on behalf of a Telegram Business account.
   * Regular bots cannot mark messages read (Telegram does it implicitly when
   * the webhook returns 200). Requires `businessConnectionId` from the
   * `business_connection` update on Subscribe.
   */
  async markBusinessRead(opts: MarkBusinessReadOptions): Promise<void> {
    try {
      await this.transport.bot.markBusinessRead(
        {
          businessConnectionId: opts.businessConnectionId,
          chatId: opts.chatId,
          messageId: opts.messageId,
        },
        { metadata: this.transport.metadata() }
      );
    } catch (err) {
      throw wrapGrpcError(err);
    }
  }
}

function buildSendRequest(opts: SendOptions): SendRequest {
  const base = {
    chatId: opts.chatId,
    ...(opts.replyToMessageId === undefined
      ? {}
      : { replyToMessageId: opts.replyToMessageId }),
    rawParams: opts.params ?? {},
  };
  const content = pickContent(opts);
  if ("text" in opts && opts.linkPreviewOptions) {
    return {
      ...base,
      content,
      linkPreviewOptions: toProtoLinkPreview(opts.linkPreviewOptions),
    };
  }
  return { ...base, content };
}

function pickContent(opts: SendOptions): SendRequest["content"] {
  if ("text" in opts) {
    return { $case: "text", text: opts.text };
  }
  if ("photo" in opts) {
    return { $case: "photo", photo: toProtoMedia(opts.photo) };
  }
  if ("video" in opts) {
    return { $case: "video", video: toProtoMedia(opts.video) };
  }
  if ("audio" in opts) {
    return { $case: "audio", audio: toProtoMedia(opts.audio) };
  }
  if ("voice" in opts) {
    return { $case: "voice", voice: toProtoMedia(opts.voice) };
  }
  if ("document" in opts) {
    return { $case: "document", document: toProtoMedia(opts.document) };
  }
  if ("sticker" in opts) {
    return {
      $case: "sticker",
      sticker: toProtoMedia(opts.sticker as MediaInput),
    };
  }
  if ("location" in opts) {
    return { $case: "location", location: toProtoLocation(opts.location) };
  }
  if ("contact" in opts) {
    return { $case: "contact", contact: toProtoContact(opts.contact) };
  }
  if ("poll" in opts) {
    return { $case: "poll", poll: toProtoPoll(opts.poll) };
  }
  if ("attachment" in opts) {
    return attachmentToContent(opts.attachment);
  }
  throw new TypeError(
    "send: opts must include one of text, photo, video, audio, voice, document, sticker, location, contact, poll, attachment"
  );
}

function attachmentToContent(att: AttachmentInput): SendRequest["content"] {
  const kind = attachmentKind(att);
  const media = toProtoMedia(attachmentToMedia(att));
  switch (kind) {
    case "photo":
      return { $case: "photo", photo: media };
    case "video":
      return { $case: "video", video: media };
    case "audio":
      return { $case: "audio", audio: media };
    default:
      return { $case: "document", document: media };
  }
}

function attachmentToMedia(att: AttachmentInput): MediaInput {
  return {
    data: att.data,
    mimeType: att.mimeType,
    ...(att.filename === undefined ? {} : { filename: att.filename }),
    ...(att.caption === undefined ? {} : { caption: att.caption }),
  };
}

function toProtoGroupItem(item: GroupItemInput): ProtoGroupItem {
  if ("photo" in item) {
    return { kind: "photo", media: toProtoMedia(item.photo) };
  }
  if ("video" in item) {
    return { kind: "video", media: toProtoMedia(item.video) };
  }
  if ("audio" in item) {
    return { kind: "audio", media: toProtoMedia(item.audio) };
  }
  if ("document" in item) {
    return { kind: "document", media: toProtoMedia(item.document) };
  }
  if ("attachment" in item) {
    const kind = attachmentKind(item.attachment);
    return { kind, media: toProtoMedia(attachmentToMedia(item.attachment)) };
  }
  throw new TypeError(
    "sendGroup item must be one of photo, video, audio, document, attachment"
  );
}

function pickEditMediaContent(
  opts: EditMediaOptions
): EditMediaRequest["content"] {
  if ("photo" in opts) {
    return { $case: "photo", photo: toProtoMedia(opts.photo) };
  }
  if ("video" in opts) {
    return { $case: "video", video: toProtoMedia(opts.video) };
  }
  if ("audio" in opts) {
    return { $case: "audio", audio: toProtoMedia(opts.audio) };
  }
  if ("document" in opts) {
    return { $case: "document", document: toProtoMedia(opts.document) };
  }
  if ("attachment" in opts) {
    const kind = attachmentKind(opts.attachment);
    const media = toProtoMedia(attachmentToMedia(opts.attachment));
    switch (kind) {
      case "photo":
        return { $case: "photo", photo: media };
      case "video":
        return { $case: "video", video: media };
      case "audio":
        return { $case: "audio", audio: media };
      default:
        return { $case: "document", document: media };
    }
  }
  throw new TypeError(
    "editMedia: opts must include one of photo, video, audio, document, attachment"
  );
}

function toProtoMedia(input: MediaInput): ProtoMedia {
  const out: ProtoMedia = {
    ...(input.caption === undefined ? {} : { caption: input.caption }),
    ...(input.filename === undefined ? {} : { filename: input.filename }),
    ...(input.mimeType === undefined ? {} : { mimeType: input.mimeType }),
  };
  if (input.fileId !== undefined) {
    out.source = { $case: "fileId", fileId: input.fileId };
    return out;
  }
  if (input.url !== undefined) {
    out.source = { $case: "url", url: input.url };
    return out;
  }
  if (input.data !== undefined) {
    out.source = { $case: "data", data: input.data };
    return out;
  }
  throw new TypeError("media requires one of fileId, url, or data");
}

function toProtoLocation(input: LocationInput): ProtoLocation {
  return {
    latitude: input.latitude,
    longitude: input.longitude,
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.address === undefined ? {} : { address: input.address }),
  };
}

function toProtoContact(input: ContactInput): ProtoContact {
  return {
    phoneNumber: input.phoneNumber,
    firstName: input.firstName,
    ...(input.lastName === undefined ? {} : { lastName: input.lastName }),
    ...(input.vcard === undefined ? {} : { vcard: input.vcard }),
  };
}

function toProtoPoll(input: PollInput): ProtoPoll {
  return {
    question: input.question,
    options: input.options,
    ...(input.type === undefined ? {} : { type: input.type }),
    ...(input.allowsMultipleAnswers === undefined
      ? {}
      : { allowsMultipleAnswers: input.allowsMultipleAnswers }),
    ...(input.isAnonymous === undefined
      ? {}
      : { isAnonymous: input.isAnonymous }),
    ...(input.correctOptionId === undefined
      ? {}
      : { correctOptionId: input.correctOptionId }),
    ...(input.explanation === undefined
      ? {}
      : { explanation: input.explanation }),
    ...(input.openPeriod === undefined ? {} : { openPeriod: input.openPeriod }),
  };
}

function toProtoLinkPreview(o: LinkPreviewOptions): ProtoLinkPreviewOptions {
  return {
    ...(o.isDisabled === undefined ? {} : { isDisabled: o.isDisabled }),
    ...(o.url === undefined ? {} : { url: o.url }),
    ...(o.preferSmallMedia === undefined
      ? {}
      : { preferSmallMedia: o.preferSmallMedia }),
    ...(o.preferLargeMedia === undefined
      ? {}
      : { preferLargeMedia: o.preferLargeMedia }),
    ...(o.showAboveText === undefined
      ? {}
      : { showAboveText: o.showAboveText }),
  };
}
