import { EtaError } from "@bgub/eta";

export class LatexRenderError extends Error {
  constructor(msg: string, opt?: ErrorOptions) {
    super(msg, opt);
    this.name = "LatexRenderError";
    Object.setPrototypeOf(this, LatexRenderError.prototype);
  }

  toJSON() {
    let cause = this.cause ?? {};
    if (this.cause instanceof EtaError) {
      cause = {
        name: this.cause.name,
        message: this.cause.message,
      };
    }
    return {
      name: this.name,
      message: this.message,
      cause: cause,
    };
  }
}

export class LatexCompileError extends Error {
  constructor(msg: string, opt?: ErrorOptions) {
    super(msg, opt);
    this.name = "LatexCompileError";
    Object.setPrototypeOf(this, LatexCompileError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      cause: this.cause ?? {},
    };
  }
}
