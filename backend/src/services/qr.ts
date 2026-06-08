import { type Exam, type Language } from "../types/exam.ts";
import { ExamPageQRData, ExamQRData as ExamQRData } from "../types/scan.ts";

const QR_CACHE_LANGUAGES: Language[] = ["DE", "EN"];

export class QRError extends Error {
  constructor(msg: string, opt?: ErrorOptions) {
    super(msg, opt);
    this.name = "QRError";
    Object.setPrototypeOf(this, QRError.prototype);
  }
}

/**
 * Generates front page QR codes with error correction level H.
 * @param path the path to save the QR code image.
 * @param exam the {@link Exam} data.
 * @param language the language of the exam.
 * @param code the exam random code.
 * @returns the content of the QR code.
 */
export async function generateExamQR(
  path: string,
  exam: Exam,
  language: Language,
  code: string,
): Promise<string> {
  if (exam.points === undefined || exam.points < 1) {
    throw new QRError("Exam points must be defined and greater than 0");
  }

  if (exam.pageCount === undefined || exam.pageCount < 4) {
    throw new QRError("Undefined or invalid exam page count (<4)");
  }

  const content =
    `{'v':'${exam.courseName}','s':'${exam.semester}','d':'${exam.date}','l':'${language}','c':${exam.pageCount},'t':${exam.points},'r':'${code}'}`;

  await generate(path, content);

  return content;
}

/**
 * Generates per-page codes with qr error correction level H.
 * @param path the path to save the QR code image.
 * @param examCode the exam random code.
 * @param page the page number.
 * @returns the content of the QR code.
 */
export async function generatePageQR(
  path: string,
  examCode: string,
  page: number,
): Promise<string> {
  const content = `{'p':${page},'r':'${examCode}'}`;

  await generate(path, content);
  return content;
}

async function generate(
  path: string,
  content: string,
) {
  const cmd = new Deno.Command("qrencode", {
    args: [
      "--level",
      "H",
      "--size", // per pixel
      "5",
      "--dpi",
      "300",
      "--type",
      "PNG",
      "--output",
      path,
      content,
    ],
    stdout: "null",
    stderr: "piped",
  });

  const child = cmd.spawn();
  const status = await child.status;
  if (!status.success) {
    const stderr = await child.stderr.text();
    throw new QRError(`Failed generating QR code: ${stderr}`);
  }
  await child.stderr.cancel();
}

/**
 * Parses a QR code from an image at the given path and returns the decoded data.
 * @param path the path to the QR code image.
 * @returns the decoded data as an {@link ExamQRData} or {@link ExamPageQRData} object.
 */
export async function parseQR(
  path: string,
): Promise<ExamQRData | ExamPageQRData> {
  const cmd = new Deno.Command("zbarimg", {
    args: [
      "-q",
      "-Sdisable",
      "-Sqrcode.enable",
      path,
    ],
    stdout: "piped",
    stderr: "null",
  });

  const child = cmd.spawn();

  const status = await child.status;
  switch (status.code) {
    case 0:
      break;
    case 1:
      await child.stdout.cancel();
      throw new QRError("IO error or ImageMagick error");
    case 2:
      await child.stdout.cancel();
      throw new QRError("ImageMagick fatal error");
    // 3 is not possible since we are not running in interactive mode
    case 4:
      await child.stdout.cancel();
      throw new QRError("QR code not found");
    default:
      await child.stdout.cancel();
      throw new QRError("Unknown error");
  }

  const stdoutStr = await child.stdout.text();
  if (!stdoutStr.startsWith("QR-Code:")) {
    throw new QRError(`Unexpected data found: ${stdoutStr}`);
  }
  for (let line of stdoutStr.split("\n")) {
    line = line.slice(9, line.length - 1); // Removes the Prefix and "{" "}"
    try {
      if (line.startsWith("'v'")) {
        return parseExamData(line);
      } else if (line.startsWith("'p'")) {
        return parsePageData(line);
      }
    } catch (e) {
      throw new QRError(`Failed to parse line: ${e}`);
    }
  }
  throw new QRError(`Failed to parse data: ${stdoutStr}`);
}

function parsePageData(line: string): ExamPageQRData {
  const fields = line.split(",");
  const map: Record<string, string> = {};
  for (const f of fields) {
    const [key, value] = f.split(":");
    switch (key) {
      case "'p'":
        map.page = value;
        break;
      case "'r'":
        map.code = value.slice(1, -1);
        break;
    }
  }
  return mapToExamPageScan(map);
}

function parseExamData(line: string): ExamQRData {
  const fields = line.split(",");
  const map: Record<string, string> = {};
  for (const f of fields) {
    const [key, value] = f.split(":");
    switch (key) {
      case "'r'":
        map.code = value.slice(1, -1);
        break;
      case "'v'":
        map.courseName = value.slice(1, -1);
        break;
      case "'s'":
        map.semester = value.slice(1, -1);
        break;
      case "'d'":
        map.date = value.slice(1, -1);
        break;
      case "'l'":
        map.language = value.slice(1, -1);
        break;
      case "'t'":
        map.points = value;
        break;
      case "'c'":
        map.pageCount = value;
        break;
    }
  }
  return mapToExamScan(map);
}

function mapToExamScan(map: Record<string, string>): ExamQRData {
  return new ExamQRData(
    map.courseName,
    map.semester,
    map.date,
    map.language.toUpperCase() as Language,
    parseInt(map.pageCount),
    parseInt(map.points),
    map.code,
  );
}

function mapToExamPageScan(map: Record<string, string>): ExamPageQRData {
  return new ExamPageQRData(
    map.code,
    parseInt(map.page),
  );
}
