export { attachment } from "./attachment.js";
export type { TelegramClient } from "./client.js";
export { createClient } from "./client.js";
export {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  TelegramTransportError,
  UnavailableError,
  ValidationError,
} from "./errors.js";
export { EventsResource } from "./events.js";
export { FilesResource } from "./files.js";
export { MessagesResource } from "./messages.js";
export type {
  AttachmentInput,
  ChatActionName,
  ClientOptions,
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
  ReconnectOptions,
  ReplayOptions,
  SendChatActionOptions,
  SendGroupOptions,
  SendOptions,
  SubscribeOptions,
} from "./options.js";
export { TypedEventStream } from "./stream.js";
export type {
  Chat,
  FileUrl,
  InboundContact,
  InboundLocation,
  InboundMedia,
  InboundMessage,
  MessageReaction,
  PollAnswerUpdate,
  PollUpdate,
  SendResult,
  TelegramEvent,
  User,
} from "./types.js";
