/**
 * TypedEventStream — async-iterable wrapper around a gRPC server-stream.
 *
 * Lets a consumer swap an underlying source while keeping a stable
 * user-facing stream alive.
 *
 * Only one consumer is allowed per stream. Call `.close()` (or
 * `Symbol.asyncDispose`) to stop consumption.
 */
export class TypedEventStream<T> implements AsyncIterable<T>, AsyncDisposable {
  private readonly _source: AsyncIterable<T>;
  private readonly _cleanup?: () => Promise<void>;
  private _consumed = false;
  private _closed = false;

  constructor(source: AsyncIterable<T>, cleanup?: () => Promise<void>) {
    this._source = source;
    if (cleanup) {
      this._cleanup = cleanup;
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    if (this._consumed) {
      throw new Error("TypedEventStream: already consumed");
    }
    this._consumed = true;
    for await (const event of this._source) {
      if (this._closed) {
        return;
      }
      yield event;
    }
  }

  async close(): Promise<void> {
    if (this._closed) {
      return;
    }
    this._closed = true;
    await this._cleanup?.();
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }
}
