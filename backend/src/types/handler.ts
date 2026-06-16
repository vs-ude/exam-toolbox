export type HandlerResult =
  | { kind: "json"; status?: number; body: unknown }
  | {
    kind: "binary";
    content: Uint8Array;
    contentType: string;
    fileName: string;
    extraHeaders?: Record<string, string>;
  };

export class HttpError extends Error {
  status: number;
  body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}
