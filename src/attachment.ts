import type { AttachmentInput } from "./options.js";

/**
 * Build an `AttachmentInput` the SDK can route to the right typed send.
 *
 * Pass either:
 *   - a file path (Node only): mime + filename are inferred from the path
 *   - a `Uint8Array`: requires `mimeType` (and optionally `filename`)
 *
 * The SDK auto-routes by mime when you pass the result via `send({ attachment })`:
 *   image/* → photo (image/gif → document; Telegram has no native gif send)
 *   video/* → video
 *   audio/* → audio
 *   anything else → document
 */
export async function attachment(
  input: string | Uint8Array,
  options?: { caption?: string; filename?: string; mimeType?: string }
): Promise<AttachmentInput> {
  if (typeof input === "string") {
    return await attachmentFromPath(input, options);
  }
  return attachmentFromBuffer(input, options);
}

function attachmentFromBuffer(
  data: Uint8Array,
  options?: { caption?: string; filename?: string; mimeType?: string }
): AttachmentInput {
  const mimeType = options?.mimeType ?? mimeFromFilename(options?.filename);
  if (!mimeType) {
    throw new TypeError(
      "attachment(buffer): pass options.mimeType (could not infer from filename)"
    );
  }
  return {
    data,
    mimeType,
    ...(options?.filename === undefined ? {} : { filename: options.filename }),
    ...(options?.caption === undefined ? {} : { caption: options.caption }),
  };
}

async function attachmentFromPath(
  path: string,
  options?: { caption?: string; filename?: string; mimeType?: string }
): Promise<AttachmentInput> {
  // Dynamic imports keep the SDK usable in non-Node runtimes when callers
  // build attachments from buffers only.
  const [{ readFile }, { basename }] = await Promise.all([
    import("node:fs/promises"),
    import("node:path"),
  ]);
  const data = new Uint8Array(await readFile(path));
  const filename = options?.filename ?? basename(path);
  const mimeType =
    options?.mimeType ?? mimeFromFilename(filename) ?? mimeFromFilename(path);
  if (!mimeType) {
    throw new TypeError(
      `attachment("${path}"): could not infer mime; pass options.mimeType`
    );
  }
  return {
    data,
    mimeType,
    filename,
    ...(options?.caption === undefined ? {} : { caption: options.caption }),
  };
}

const MIME_BY_EXT: Readonly<Record<string, string>> = {
  // images
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  tiff: "image/tiff",
  // video
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  // audio
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/opus",
  wav: "audio/wav",
  flac: "audio/flac",
  // documents
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  json: "application/json",
  csv: "text/csv",
  html: "text/html",
  xml: "application/xml",
  zip: "application/zip",
  gz: "application/gzip",
  tar: "application/x-tar",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function mimeFromFilename(name: string | undefined): string | undefined {
  if (!name) {
    return;
  }
  const dot = name.lastIndexOf(".");
  if (dot < 0 || dot === name.length - 1) {
    return;
  }
  const ext = name.slice(dot + 1).toLowerCase();
  return MIME_BY_EXT[ext];
}

/**
 * Map an attachment to the Telegram media kind the SDK should dispatch on.
 * Used internally by `send` and `sendGroup` to route generic attachments.
 */
export function attachmentKind(
  att: AttachmentInput
): "photo" | "video" | "audio" | "document" {
  const mime = att.mimeType.toLowerCase();
  // image/gif animations don't survive Telegram's photo pipeline; ship as a
  // document so the bytes round-trip intact (TG supports inline GIFs but only
  // via the dedicated sendAnimation endpoint, which we don't surface).
  if (mime === "image/gif") {
    return "document";
  }
  if (mime.startsWith("image/")) {
    return "photo";
  }
  if (mime.startsWith("video/")) {
    return "video";
  }
  if (mime.startsWith("audio/")) {
    return "audio";
  }
  return "document";
}
