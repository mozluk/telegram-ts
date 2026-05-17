export interface User {
  readonly firstName: string;
  readonly id: string;
  readonly isBot: boolean;
  readonly languageCode?: string;
  readonly lastName?: string;
  readonly username?: string;
}

export interface Chat {
  readonly id: string;
  readonly title?: string;
  /** "private" | "group" | "supergroup" | "channel". */
  readonly type: string;
  readonly username?: string;
}

export interface InboundMedia {
  readonly durationSec?: number;
  readonly fileId: string;
  readonly filename?: string;
  readonly fileSize?: number;
  readonly fileUniqueId: string;
  readonly height?: number;
  readonly mimeType?: string;
  readonly width?: number;
}

export interface InboundLocation {
  readonly address?: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly title?: string;
}

export interface InboundContact {
  readonly firstName: string;
  readonly lastName?: string;
  readonly phoneNumber: string;
  readonly userId?: string;
  readonly vcard?: string;
}

export interface InboundMessage {
  readonly audio?: InboundMedia;
  readonly caption?: string;
  readonly chat: Chat;
  readonly contact?: InboundContact;
  readonly date: Date;
  readonly document?: InboundMedia;
  readonly from?: User;
  readonly location?: InboundLocation;
  readonly mediaGroupId?: string;
  readonly messageId: string;
  readonly photo?: InboundMedia;
  /** Raw Telegram Update JSON. */
  readonly raw: Uint8Array;
  readonly replyToMessageId?: string;
  readonly sticker?: InboundMedia;
  readonly text: string;
  readonly video?: InboundMedia;
  readonly voice?: InboundMedia;
}

export interface MessageReaction {
  readonly chat: Chat;
  readonly emoji: readonly string[];
  readonly from?: User;
  readonly messageId: string;
  readonly raw: Uint8Array;
}

export interface PollUpdate {
  readonly pollId: string;
  readonly raw: Uint8Array;
}

export interface PollAnswerUpdate {
  readonly from?: User;
  /** 0-based indices into the original poll's options. Empty = vote retracted. */
  readonly optionIds: readonly number[];
  readonly pollId: string;
  readonly raw: Uint8Array;
}

export type TelegramEvent =
  | {
      readonly type: "message";
      readonly cursor: number;
      readonly receivedAt: Date;
      readonly message: InboundMessage;
    }
  | {
      readonly type: "reaction";
      readonly cursor: number;
      readonly receivedAt: Date;
      readonly reaction: MessageReaction;
    }
  | {
      readonly type: "poll";
      readonly cursor: number;
      readonly receivedAt: Date;
      readonly poll: PollUpdate;
    }
  | {
      readonly type: "poll_answer";
      readonly cursor: number;
      readonly receivedAt: Date;
      readonly answer: PollAnswerUpdate;
    }
  | { readonly type: "heartbeat"; readonly at: Date };

export interface SendResult {
  readonly chatId: string;
  readonly messageId: string;
}

export interface FileUrl {
  readonly url: string;
}
