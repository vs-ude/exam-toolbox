export class ImageProcessingError extends Error {
  constructor(msg: string, opt?: ErrorOptions) {
    super(msg, opt);
    this.name = 'ImageProcessingError';
    Object.setPrototypeOf(this, ImageProcessingError.prototype);
  }
}

/**
 * Applies a contrast adjustment to the image at `path`, saving the result to `dest`.
 * @param threshold is the symmetric contrast threshold to apply, as a percentage (0-100).
 * @returns the path to the processed image for chaining.
 */
export async function contrastAdjust(
  path: string,
  dest: string,
  threshold: number,
): Promise<string> {
  const cmd = new Deno.Command('magick', {
    args: [
      path,
      '-level',
      `${threshold}%,${100 - threshold}%`, // lowest x% map to black, highest x% to white
      dest,
    ],
    stdout: 'null',
    stderr: 'piped',
  });

  const child = cmd.spawn();

  const status = await child.status;
  let stderr: string;
  switch (status.code) {
    case 0:
      await child.stderr.cancel();
      return dest;
    case 1:
      stderr = await child.stderr.text();
      throw new ImageProcessingError(`Image processing failed: ${stderr}`);
    default:
      stderr = await child.stderr.text();
      throw new ImageProcessingError(`Unknown error: ${stderr}`);
  }
}
