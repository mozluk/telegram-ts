import type {
  Chat as ProtoChat,
  Event as ProtoEvent,
  InboundContact as ProtoInboundContact,
  InboundLocation as ProtoInboundLocation,
  InboundMedia as ProtoInboundMedia,
  InboundMessage as ProtoInboundMessage,
  Reaction as ProtoReaction,
  User as ProtoUser,
} from "./_gen/spectrum/telegram/v1/bot.js";
import type {
  Chat,
  InboundContact,
  InboundLocation,
  InboundMedia,
  InboundMessage,
  MessageReaction,
  PollAnswerUpdate,
  PollUpdate,
  TelegramEvent,
  User,
} from "./types.js";

export function mapProtoEvent(proto: ProtoEvent): TelegramEvent | undefined {
  const payload = proto.payload;
  if (!payload) {
    return;
  }

  switch (payload.$case) {
    case "heartbeat":
      return { type: "heartbeat", at: payload.heartbeat.at ?? new Date() };
    case "message":
      return {
        type: "message",
        cursor: proto.cursor,
        receivedAt: proto.receivedAt ?? new Date(),
        message: mapMessage(payload.message),
      };
    case "reaction":
      return {
        type: "reaction",
        cursor: proto.cursor,
        receivedAt: proto.receivedAt ?? new Date(),
        reaction: mapReaction(payload.reaction),
      };
    case "poll": {
      const poll: PollUpdate = {
        pollId: payload.poll.pollId,
        raw: payload.poll.raw,
      };
      return {
        type: "poll",
        cursor: proto.cursor,
        receivedAt: proto.receivedAt ?? new Date(),
        poll,
      };
    }
    case "pollAnswer": {
      const a = payload.pollAnswer;
      const answer: PollAnswerUpdate = {
        pollId: a.pollId,
        ...(a.from ? { from: mapUser(a.from) } : {}),
        optionIds: a.optionIds,
        raw: a.raw,
      };
      return {
        type: "poll_answer",
        cursor: proto.cursor,
        receivedAt: proto.receivedAt ?? new Date(),
        answer,
      };
    }
    default:
      return;
  }
}

function mapMessage(m: ProtoInboundMessage): InboundMessage {
  return {
    messageId: m.messageId,
    chat: mapChat(m.chat),
    ...(m.from ? { from: mapUser(m.from) } : {}),
    date: m.date ?? new Date(0),
    text: m.text,
    ...(m.caption === undefined ? {} : { caption: m.caption }),
    ...(m.mediaGroupId === undefined ? {} : { mediaGroupId: m.mediaGroupId }),
    ...(m.replyToMessageId === undefined
      ? {}
      : { replyToMessageId: m.replyToMessageId }),
    ...(m.photo ? { photo: mapMedia(m.photo) } : {}),
    ...(m.video ? { video: mapMedia(m.video) } : {}),
    ...(m.audio ? { audio: mapMedia(m.audio) } : {}),
    ...(m.voice ? { voice: mapMedia(m.voice) } : {}),
    ...(m.document ? { document: mapMedia(m.document) } : {}),
    ...(m.sticker ? { sticker: mapMedia(m.sticker) } : {}),
    ...(m.location ? { location: mapLocation(m.location) } : {}),
    ...(m.contact ? { contact: mapContact(m.contact) } : {}),
    raw: m.raw,
  };
}

function mapMedia(m: ProtoInboundMedia): InboundMedia {
  return {
    fileId: m.fileId,
    fileUniqueId: m.fileUniqueId,
    ...(m.fileSize === undefined ? {} : { fileSize: m.fileSize }),
    ...(m.mimeType === undefined ? {} : { mimeType: m.mimeType }),
    ...(m.filename === undefined ? {} : { filename: m.filename }),
    ...(m.durationSec === undefined ? {} : { durationSec: m.durationSec }),
    ...(m.width === undefined ? {} : { width: m.width }),
    ...(m.height === undefined ? {} : { height: m.height }),
  };
}

function mapLocation(l: ProtoInboundLocation): InboundLocation {
  return {
    latitude: l.latitude,
    longitude: l.longitude,
    ...(l.title === undefined ? {} : { title: l.title }),
    ...(l.address === undefined ? {} : { address: l.address }),
  };
}

function mapContact(c: ProtoInboundContact): InboundContact {
  return {
    phoneNumber: c.phoneNumber,
    firstName: c.firstName,
    ...(c.lastName === undefined ? {} : { lastName: c.lastName }),
    ...(c.vcard === undefined ? {} : { vcard: c.vcard }),
    ...(c.userId === undefined ? {} : { userId: c.userId }),
  };
}

function mapReaction(r: ProtoReaction): MessageReaction {
  return {
    messageId: r.messageId,
    chat: mapChat(r.chat),
    ...(r.from ? { from: mapUser(r.from) } : {}),
    emoji: r.emoji,
    raw: r.raw,
  };
}

function mapChat(c: ProtoChat | undefined): Chat {
  if (!c) {
    return { id: "", type: "" };
  }
  return {
    id: c.id,
    type: c.type,
    ...(c.title === undefined ? {} : { title: c.title }),
    ...(c.username === undefined ? {} : { username: c.username }),
  };
}

function mapUser(u: ProtoUser): User {
  return {
    id: u.id,
    firstName: u.firstName,
    ...(u.lastName === undefined ? {} : { lastName: u.lastName }),
    ...(u.username === undefined ? {} : { username: u.username }),
    isBot: u.isBot,
    ...(u.languageCode === undefined ? {} : { languageCode: u.languageCode }),
  };
}
