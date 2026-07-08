/**
 * Creates a ZIP archive from specified files inside `sourceDirectory`.
 * @param sourceDirectory - The directory containing the files to be zipped.
 * @param zipFilePath - The path where the ZIP archive will be saved.
 * @param files - A list of file patterns to include in the ZIP archive; supports globbing.
 */
export async function createZipArchiveFromDirectory(
  sourceDirectory: string,
  zipFilePath: string,
  files: string[],
): Promise<void> {
  const cmd = new Deno.Command('bash', {
    args: ['-c', `zip ${zipFilePath} ${files.join(' ')}`],
    stdout: 'null',
    stderr: 'null',
    cwd: sourceDirectory,
  });

  const child = cmd.spawn();

  const status = await child.status;
  if (!status.success) {
    // bash returns the zip status code as its own
    throw new ZipError(status.code);
  }

  const stat = await Deno.stat(zipFilePath);
  if (!stat.isFile) {
    throw new ZipError(undefined, 'zip file not created');
  }
}

export class ZipError extends Error {
  constructor(code?: number, msg?: string, opt?: ErrorOptions) {
    if (msg === undefined && code !== undefined) {
      msg = decodeZipReturn(code);
    }
    super(msg, opt);
    this.name = 'ZipError';
    Object.setPrototypeOf(this, ZipError.prototype);
  }
}

function decodeZipReturn(code: number): string {
  let desc = '';
  switch (
    code // Copy-paste from `man zip` (v3.0)
  ) {
    case 2:
      desc = 'unexpected end of zip file.';
      break;
    case 3:
      desc =
        'a generic error in the zipfile format was detected.  Processing may have completed successfully';
      break;
    case 4:
      desc =
        'zip was unable to allocate memory for one or more buffers during program initialization.';
      break;
    case 5:
      desc =
        'a severe error in the zipfile format was detected.  Processing probably failed immediately.';
      break;
    case 6:
      desc =
        'entry too large to be processed (such as input files larger than 2 GB when not using Zip64 or trying to read an existing archive that is too large) or entry too large to be split with zip-split';
      break;
    case 7:
      desc = 'invalid comment format';
      break;
    case 8:
      desc = 'zip -T failed or out of memory';
      break;
    case 9:
      desc = 'the user aborted zip prematurely with control-C (or similar)';
      break;
    case 10:
      desc = 'zip encountered an error while using a temp file';
      break;
    case 11:
      desc = 'read or seek error';
      break;
    case 12:
      desc = 'zip has nothing to do';
      break;
    case 13:
      desc = 'missing or empty zip file';
      break;
    case 14:
      desc = 'error writing to a file';
      break;
    case 15:
      desc = 'zip was unable to create a file to write to';
      break;
    case 16:
      desc = 'bad command line parameters';
      break;
    case 18:
      desc = 'zip could not open a specified file to read';
      break;
    case 19:
      desc = 'zip was compiled with options not supported on this system';
      break;
    default:
      desc = `unknown error code ${code}`;
      break;
  }
  return desc;
}
