import { wrapGrpcError } from "./errors.js";
import type { Transport } from "./transport.js";
import type { FileUrl } from "./types.js";

export class FilesResource {
  private readonly transport: Transport;

  constructor(transport: Transport) {
    this.transport = transport;
  }

  /** Returns an https URL valid for ~1h. Don't persist it. */
  async getUrl(fileId: string): Promise<FileUrl> {
    try {
      const r = await this.transport.bot.getFileUrl(
        { fileId },
        { metadata: this.transport.metadata() }
      );
      return { url: r.url };
    } catch (err) {
      throw wrapGrpcError(err);
    }
  }
}
