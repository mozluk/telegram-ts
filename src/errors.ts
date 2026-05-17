import { ClientError, Status } from "nice-grpc";

export interface TelegramTransportErrorOptions {
  readonly cause?: Error;
  readonly grpcCode: number;
  readonly retryAfterSec?: number;
  readonly retryable: boolean;
}

export class TelegramTransportError extends Error {
  readonly grpcCode: number;
  readonly retryable: boolean;
  readonly retryAfterSec?: number;

  constructor(message: string, opts: TelegramTransportErrorOptions) {
    super(message, opts.cause ? { cause: opts.cause } : undefined);
    this.name = "TelegramTransportError";
    this.grpcCode = opts.grpcCode;
    this.retryable = opts.retryable;
    if (opts.retryAfterSec !== undefined) {
      this.retryAfterSec = opts.retryAfterSec;
    }
  }
}

export class AuthenticationError extends TelegramTransportError {
  constructor(message: string, opts: TelegramTransportErrorOptions) {
    super(message, opts);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends TelegramTransportError {
  constructor(message: string, opts: TelegramTransportErrorOptions) {
    super(message, opts);
    this.name = "RateLimitError";
  }
}

export class NotFoundError extends TelegramTransportError {
  constructor(message: string, opts: TelegramTransportErrorOptions) {
    super(message, opts);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends TelegramTransportError {
  constructor(message: string, opts: TelegramTransportErrorOptions) {
    super(message, opts);
    this.name = "ValidationError";
  }
}

export class UnavailableError extends TelegramTransportError {
  constructor(message: string, opts: TelegramTransportErrorOptions) {
    super(message, opts);
    this.name = "UnavailableError";
  }
}

export function wrapGrpcError(err: unknown): Error {
  if (!(err instanceof ClientError)) {
    return err instanceof Error ? err : new Error(String(err));
  }
  const retryAfterSec = parseRetryAfter(err);
  const opts: TelegramTransportErrorOptions = {
    cause: err,
    grpcCode: err.code,
    retryable: isRetryable(err.code),
    ...(retryAfterSec === undefined ? {} : { retryAfterSec }),
  };
  switch (err.code) {
    case Status.UNAUTHENTICATED:
    case Status.PERMISSION_DENIED:
      return new AuthenticationError(err.message, opts);
    case Status.RESOURCE_EXHAUSTED:
      return new RateLimitError(err.message, opts);
    case Status.NOT_FOUND:
      return new NotFoundError(err.message, opts);
    case Status.INVALID_ARGUMENT:
    case Status.FAILED_PRECONDITION:
      return new ValidationError(err.message, opts);
    case Status.UNAVAILABLE:
    case Status.DEADLINE_EXCEEDED:
      return new UnavailableError(err.message, opts);
    default:
      return new TelegramTransportError(err.message, opts);
  }
}

function isRetryable(code: number): boolean {
  return (
    code === Status.UNAVAILABLE ||
    code === Status.DEADLINE_EXCEEDED ||
    code === Status.RESOURCE_EXHAUSTED
  );
}

function parseRetryAfter(err: ClientError): number | undefined {
  const md = (
    err as unknown as { metadata?: { get(k: string): string | undefined } }
  ).metadata;
  if (!md) {
    return;
  }
  const raw = md.get("retry-after");
  if (!raw) {
    return;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}
