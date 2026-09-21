import { QRConfig } from '../config/mod.ts';

import { type Exam, type Language } from '../types/mod.ts';
import { ExamPageQRData, ExamQRData } from '../types/scan.ts';
import { getOrCreateDb } from './db/db.ts';
import { QRCacheDocument } from './db/qr.ts';
import { parseExamCode } from './exam_code.ts';

export class QRError extends Error {
  constructor(msg: string, opt?: ErrorOptions) {
    super(msg, opt);
    this.name = 'QRError';
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
  language: string,
  code: string,
): Promise<string> {
  if (exam.points === undefined || exam.points < 1) {
    throw new QRError('Exam points must be defined and greater than 0');
  }

  if (exam.pageCount === undefined || exam.pageCount < 4) {
    throw new QRError('Undefined or invalid exam page count (<4)');
  }

  const content = `{'v':'${exam.courseName}','s':'${exam.semester}','d':'${exam.date}','l':'${language}','c':${exam.pageCount},'t':${exam.points},'r':'${code}'}`;

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

async function generate(path: string, content: string) {
  const cmd = new Deno.Command('qrencode', {
    args: [
      '--level',
      'H',
      '--size', // per pixel
      '5',
      '--dpi',
      '300',
      '--type',
      'PNG',
      '--output',
      path,
      content,
    ],
    stdout: 'null',
    stderr: 'piped',
  });

  const child = cmd.spawn();
  const status = await child.status;
  if (!status.success) {
    const stderr = await child.stderr.text();
    throw new QRError(`Failed generating QR code: ${stderr}`);
  }
  await child.stderr.cancel();
  await removeAlphaChannel(path);
}

async function removeAlphaChannel(path: string) {
  const cmd = new Deno.Command('magick', {
    args: [path, '-alpha', 'off', path],
    stdout: 'null',
    stderr: 'piped',
  });

  const child = cmd.spawn();
  const status = await child.status;
  if (!status.success) {
    const stderr = await child.stderr.text();
    throw new QRError(`Failed removing alpha channel: ${stderr}`);
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
  const cmd = new Deno.Command('zbarimg', {
    args: ['-q', '-Sdisable', '-Sqrcode.enable', path],
    stdout: 'piped',
    stderr: 'null',
  });

  const child = cmd.spawn();

  const status = await child.status;
  switch (status.code) {
    case 0:
      break;
    case 1:
      await child.stdout.cancel();
      throw new QRError('IO error or ImageMagick error');
    case 2:
      await child.stdout.cancel();
      throw new QRError('ImageMagick fatal error');
    // 3 is not possible since we are not running in interactive mode
    case 4:
      await child.stdout.cancel();
      throw new QRError('QR code not found');
    default:
      await child.stdout.cancel();
      throw new QRError('Unknown error');
  }

  const stdoutStr = await child.stdout.text();
  if (!stdoutStr.startsWith('QR-Code:')) {
    throw new QRError(`Unexpected data found: ${stdoutStr}`);
  }
  for (let line of stdoutStr.split('\n')) {
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
  const fields = line.split(',');
  const map: Record<string, string> = {};
  for (const f of fields) {
    const [key, value] = f.split(':');
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
  const fields = line.split(',');
  const map: Record<string, string> = {};
  for (const f of fields) {
    const [key, value] = f.split(':');
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
  return new ExamPageQRData(map.code, parseInt(map.page));
}

export type QRCacheStats = {
  studentsPerLanguage: number;
  pagesPerStudent: number;
};

/**
 * Scans the QR cache directory and returns how many students per language
 * and how many pages per student are currently cached.
 *
 * Detection strategy:
 * - `pagesPerStudent`: the highest page number found among `R4ND_N.png` sentinel files.
 * - `studentsPerLanguage`: non-sentinel `.png` files / (numLanguages * pagesPerStudent).
 *
 * Returns zeros when the directory is empty or does not exist.
 */
export function getQRCacheStats(cacheDir: string): QRCacheStats {
  let pagesPerStudent = 0;
  const studentFilenames: string[] = [];

  try {
    for (const entry of Deno.readDirSync(cacheDir)) {
      if (!entry.isFile || !entry.name.endsWith('.png')) continue;

      if (entry.name.startsWith('R4ND_')) {
        const pageNum = parseInt(entry.name.slice(5, -4), 10);
        if (!isNaN(pageNum) && pageNum > pagesPerStudent) {
          pagesPerStudent = pageNum;
        }
      } else {
        studentFilenames.push(entry.name);
      }
    }
  } catch {
    return { studentsPerLanguage: 0, pagesPerStudent: 0 };
  }

  if (studentFilenames.length === 0 || pagesPerStudent === 0) {
    return { studentsPerLanguage: 0, pagesPerStudent: 0 };
  }

  // All student codes are fixed-width base-36 (same character count), so
  // lexicographic order matches numeric order. The last filename after sorting
  // therefore contains the highest student counter.
  studentFilenames.sort();

  for (let i = studentFilenames.length - 1; i >= 0; i--) {
    const name = studentFilenames[i];
    const code = name.slice(0, name.indexOf('_'));
    try {
      const { counter } = parseExamCode(code);
      return { studentsPerLanguage: counter, pagesPerStudent };
    } catch {
      continue;
    }
  }

  return { studentsPerLanguage: 0, pagesPerStudent };
}

/**
 * Ensures the QR code cache contains at least `requiredStudentsPerLanguage`
 * students and `requiredPagesPerStudent` pages. Call this before starting a
 * mass-generation job.
 *
 * The current cache dimensions are read from the filesystem via
 * {@link getQRCacheStats}. If the cache is already sufficient the function
 * returns immediately. Otherwise it generates the missing codes and updates
 * the `qrCacheStats` collection in MongoDB so subsequent calls can short-
 * circuit without re-scanning the filesystem.
 *
 * @param requiredStudentsPerLanguage minimum number of pre-generated student codes per language
 * @param requiredPagesPerStudent minimum number of pre-generated page codes per student
 * @param qrCacheCollection the MongoDB collection used to persist cache metadata
 */
export async function ensureQRCache(
  requiredStudentsPerLanguage: number,
  requiredPagesPerStudent: number,
): Promise<void> {
  const current = getQRCacheStats(QRConfig.cachePath);

  if (
    current.studentsPerLanguage >= requiredStudentsPerLanguage &&
    current.pagesPerStudent >= requiredPagesPerStudent
  ) {
    return;
  }

  console.log(
    `QR cache insufficient before generation ` +
      `(have ${current.studentsPerLanguage} students / ${current.pagesPerStudent} pages, ` +
      `need ${Math.max(
        requiredStudentsPerLanguage,
        current.studentsPerLanguage,
      )} / ${Math.max(
        requiredPagesPerStudent,
        current.pagesPerStudent,
      )}. Generating more…`,
  );

  await preGeneratePageQRCache(
    requiredStudentsPerLanguage,
    requiredPagesPerStudent,
  );
}

export async function preGeneratePageQRCache(
  studentsPerLanguage: number,
  pagesPerStudent: number,
): Promise<void> {
  await Deno.mkdir(QRConfig.cachePath, { recursive: true });

  const current = getQRCacheStats(QRConfig.cachePath);

  if (
    current.studentsPerLanguage >= studentsPerLanguage &&
    current.pagesPerStudent >= pagesPerStudent
  ) {
    console.log(
      `QR cache already sufficient in ${QRConfig.cachePath} ` +
        `(${current.studentsPerLanguage} students, ${current.pagesPerStudent} pages), skipping warmup.`,
    );
    return;
  }

  // If we only need more students (page count unchanged), generate incrementally.
  // If the required page count grew we must regenerate from student 1 so every
  // existing student also gets the extra page files.
  const startStudentNumber =
    current.pagesPerStudent >= pagesPerStudent
      ? current.studentsPerLanguage + 1
      : 1;

  const targetStudents = Math.max(
    studentsPerLanguage,
    current.studentsPerLanguage,
  );
  const targetPages = Math.max(pagesPerStudent, current.pagesPerStudent);

  console.log(
    `QR cache warmup starting from student ${startStudentNumber} ` +
      `(target: ${targetStudents} students, ${targetPages} pages).`,
  );

  await new Promise<void>((resolve, reject) => {
    const worker = new Worker(
      new URL('./qr_cache_worker.ts', import.meta.url).href,
      { type: 'module' },
    );

    worker.onmessage = (e: MessageEvent) => {
      const data = e.data;

      if (data?.status === 'success') {
        console.log(
          `QR cache warmup completed: generated ${data.generatedCount} files in ${QRConfig.cachePath}.`,
        );
        worker.terminate();

        const updated: QRCacheDocument = {
          studentsPerLanguage: targetStudents,
          pagesPerStudent: targetPages,
          lastUpdated: new Date().toISOString(),
        };

        getOrCreateDb().then(db => {
          db.setQRCache(updated);

          console.log(
            `QR cache updated and persisted: ${targetStudents} students, ` +
              `${targetPages} pages.`,
          );
          resolve();
        });
        return;
      }

      worker.terminate();
      reject(
        new QRError(
          `QR cache warmup failed: ${data?.error ?? 'unknown worker error'}`,
        ),
      );
    };

    worker.onerror = error => {
      worker.terminate();
      reject(new QRError(`QR cache warmup worker failed: ${error.message}`));
    };

    worker.postMessage({
      startStudentNumber,
      studentsPerLanguage: targetStudents,
      pagesPerStudent: targetPages,
      languages: ['A', 'B'],
    });
  });
}
