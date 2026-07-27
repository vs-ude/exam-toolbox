import { EtaError } from '@bgub/eta';

export interface CauseLocation {
  group: number;
  task: number;
  type: string;
  reason?: string;
}

export class LatexRenderError extends Error {
  public location?: CauseLocation;

  constructor(msg: string, location?: CauseLocation, opt?: ErrorOptions) {
    super(msg, opt);
    this.name = 'LatexRenderError';
    Object.setPrototypeOf(this, LatexRenderError.prototype);
    this.location = location;
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
      cause: this.location ?? cause,
    };
  }
}

export class LatexCompileError extends Error {
  constructor(msg: string, contentPath?: string, opt?: ErrorOptions) {
    super(msg, opt);
    this.name = 'LatexCompileError';
    Object.setPrototypeOf(this, LatexCompileError.prototype);

    if (contentPath) {
      let content = '';
      try {
        content = Deno.readTextFileSync(contentPath);
        this.cause = this.parseErrorLog(msg, content);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.cause = {
          info: 'Unable to read LaTeX content for marker lookup',
          error: message,
        };
      }
    }
  }

  parseErrorLog(msg: string, content: string): object {
    const errorLine = Number(msg.match(/aufgaben\.tex\:(\d+)\:/)?.[1]);
    if (!Number.isFinite(errorLine) || errorLine <= 0) {
      return { info: 'Unable to determine error line' };
    }

    const lines = content.split(/\r?\n/);
    const markerPrefix = '%% MARKER:';
    const startIndex = Math.min(lines.length - 1, errorLine - 1);

    for (let i = startIndex; i >= 0; i--) {
      const line = lines[i];
      const markerIndex = line.indexOf(markerPrefix);
      if (markerIndex !== 0) {
        // Our marker is always at the start of a line
        continue;
      }
      const rawMarker = line.slice(markerIndex + markerPrefix.length).trim();
      return JSON.parse(rawMarker);
    }

    return {
      info: 'Unable to locate marker before error line',
      line: errorLine,
    };
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      cause: this.cause ?? {},
    };
  }
}

export class InvalidPageBreakError extends Error {
  private offenses: CauseLocation[] = [];

  constructor(msg: string, offenses?: CauseLocation[]) {
    super(msg, undefined);
    this.name = 'InvalidPageBreakError';
    Object.setPrototypeOf(this, InvalidPageBreakError.prototype);

    if (offenses) {
      this.offenses = offenses;
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      offenses: this.offenses,
    };
  }
}
