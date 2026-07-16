import { assertEquals, assertInstanceOf, assertRejects } from '@std/assert';
import { generateExamQR, generatePageQR, parseQR, QRError } from './qr.ts';
import { Exam } from '../types/mod.ts';
import { ExamPageQRData, ExamQRData } from '../types/scan.ts';
import { skipIntegration } from '../config/test.ts';
import { contrastAdjust } from './preprocess.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeExam(
  overrides?: Partial<{
    points: number | undefined;
    pageCount: number | undefined;
  }>,
): Exam {
  const exam = new Exam(
    'Testlauf vong Exascan 2',
    'Prof. Tester',
    'WS 2016/17',
    '2017-02-10',
    90,
    [],
  );
  exam.points = 'points' in (overrides ?? {}) ? overrides!.points : 157;
  exam.pageCount = 'pageCount' in (overrides ?? {}) ? overrides!.pageCount : 12;
  return exam;
}

// ---------------------------------------------------------------------------
// generateExamQR – input validation (no file I/O needed, throws before generate())
// ---------------------------------------------------------------------------

Deno.test('generateExamQR throws QRError when points is invalid', async () => {
  await assertRejects(
    () =>
      generateExamQR(
        '/tmp/irrelevant.png',
        makeExam({ points: -5 }),
        'DE',
        'FFPN',
      ),
    QRError,
  );
});

Deno.test(
  'generateExamQR throws QRError when pageCount is invalid',
  async () => {
    await assertRejects(
      () =>
        generateExamQR(
          '/tmp/irrelevant.png',
          makeExam({ pageCount: 2 }),
          'DE',
          'FFPN',
        ),
      QRError,
    );
  },
);

// ---------------------------------------------------------------------------
// integration tests
// ---------------------------------------------------------------------------

Deno.test({
  name: 'generateExamQR returns the expected content string (EN)',
  ignore: skipIntegration,
  async fn() {
    const tmpDir = await Deno.makeTempDir();
    try {
      const content = await generateExamQR(
        `${tmpDir}/qr.png`,
        makeExam(),
        'EN',
        'FFPN',
      );
      assertEquals(
        content,
        "{'v':'Testlauf vong Exascan 2','s':'WS 2016/17','d':'2017-02-10','l':'EN','c':12,'t':157,'r':'FFPN'}",
      );
    } finally {
      await Deno.remove(tmpDir, { recursive: true });
    }
  },
});

Deno.test({
  name: 'generateExamQR returns the expected content string (DE)',
  ignore: skipIntegration,
  async fn() {
    const tmpDir = await Deno.makeTempDir();
    try {
      const content = await generateExamQR(
        `${tmpDir}/qr.png`,
        makeExam(),
        'DE',
        'ABCD',
      );
      assertEquals(
        content,
        "{'v':'Testlauf vong Exascan 2','s':'WS 2016/17','d':'2017-02-10','l':'DE','c':12,'t':157,'r':'ABCD'}",
      );
    } finally {
      await Deno.remove(tmpDir, { recursive: true });
    }
  },
});

Deno.test({
  name: 'generatePageQR returns the expected content string',
  ignore: skipIntegration,
  async fn() {
    const tmpDir = await Deno.makeTempDir();
    try {
      const content = await generatePageQR(`${tmpDir}/qr.png`, 'FFPN', 4);
      assertEquals(content, "{'p':4,'r':'FFPN'}");
    } finally {
      await Deno.remove(tmpDir, { recursive: true });
    }
  },
});

Deno.test({
  name: 'generatePageQR returns the expected content string for page 5',
  ignore: skipIntegration,
  async fn() {
    const tmpDir = await Deno.makeTempDir();
    try {
      const content = await generatePageQR(`${tmpDir}/qr.png`, 'FFPN', 5);
      assertEquals(content, "{'p':5,'r':'FFPN'}");
    } finally {
      await Deno.remove(tmpDir, { recursive: true });
    }
  },
});

// ---------------------------------------------------------------------------
// Round-trip tests
// ---------------------------------------------------------------------------

Deno.test({
  name: 'round-trip: generateExamQR → parseQR returns matching ExamQRData',
  ignore: skipIntegration,
  async fn() {
    const tmpDir = await Deno.makeTempDir();
    try {
      const exam = makeExam();
      const path = `${tmpDir}/exam.png`;
      await generateExamQR(path, exam, 'EN', 'FFPN');

      const result = await parseQR(path);

      assertInstanceOf(result, ExamQRData);
      assertEquals(result.courseName, 'Testlauf vong Exascan 2');
      assertEquals(result.semester, 'WS 2016/17');
      assertEquals(result.date, '2017-02-10');
      assertEquals(result.language, 'EN');
      assertEquals(result.pageCount, 12);
      assertEquals(result.points, 157);
      assertEquals(result.code, 'FFPN');
    } finally {
      await Deno.remove(tmpDir, { recursive: true });
    }
  },
});

Deno.test({
  name: 'round-trip: generateExamQR → parseQR with DE language',
  ignore: skipIntegration,
  async fn() {
    const tmpDir = await Deno.makeTempDir();
    try {
      const path = `${tmpDir}/exam_de.png`;
      await generateExamQR(path, makeExam(), 'DE', 'XYZT');

      const result = await parseQR(path);

      assertInstanceOf(result, ExamQRData);
      assertEquals(result.language, 'DE');
      assertEquals(result.code, 'XYZT');
    } finally {
      await Deno.remove(tmpDir, { recursive: true });
    }
  },
});

Deno.test({
  name: 'round-trip: generatePageQR → parseQR returns matching ExamPageQRData (page 4)',
  ignore: skipIntegration,
  async fn() {
    const tmpDir = await Deno.makeTempDir();
    try {
      const path = `${tmpDir}/page4.png`;
      await generatePageQR(path, 'FFPN', 4);

      const result = await parseQR(path);

      assertInstanceOf(result, ExamPageQRData);
      assertEquals(result.code, 'FFPN');
      assertEquals(result.page, 4);
    } finally {
      await Deno.remove(tmpDir, { recursive: true });
    }
  },
});

Deno.test({
  name: 'round-trip: generatePageQR → parseQR returns matching ExamPageQRData (page 5)',
  ignore: skipIntegration,
  async fn() {
    const tmpDir = await Deno.makeTempDir();
    try {
      const path = `${tmpDir}/page5.png`;
      await generatePageQR(path, 'FFPN', 5);

      const result = await parseQR(path);

      assertInstanceOf(result, ExamPageQRData);
      assertEquals(result.code, 'FFPN');
      assertEquals(result.page, 5);
    } finally {
      await Deno.remove(tmpDir, { recursive: true });
    }
  },
});

Deno.test({
  name: 'round-trip: generatePageQR → parseQR for multiple pages',
  ignore: skipIntegration,
  async fn() {
    const tmpDir = await Deno.makeTempDir();
    try {
      for (const page of [1, 2, 6, 10, 99]) {
        const path = `${tmpDir}/page_${page}.png`;
        await generatePageQR(path, 'ABCD', page);

        const result = await parseQR(path);

        assertInstanceOf(result, ExamPageQRData);
        assertEquals(result.code, 'ABCD', `page ${page}: wrong code`);
        assertEquals(result.page, page, `page ${page}: wrong page number`);
      }
    } finally {
      await Deno.remove(tmpDir, { recursive: true });
    }
  },
});

Deno.test({
  name: 'full-page: parseQR finds easy QR codes correctly',
  ignore: skipIntegration,
  async fn() {
    const baseDir = '../testdata/old_scans/';
    const files: Record<string, ExamPageQRData | ExamQRData> = {
      'Exam_1/exam_1.jpg': new ExamQRData(
        'Testlauf vong Exascan 2',
        'WS 2016/17',
        '2017-02-10',
        'EN',
        12,
        157,
        'FFPN',
      ),
      'Exam_1/exam_4.jpg': new ExamPageQRData('FFPN', 4),
      'Exam_1/exam_5.jpg': new ExamPageQRData('FFPN', 5),
      'Exam_1/exam_6.jpg': new ExamPageQRData('FFPN', 6),
      'Exam_1/exam_9.jpg': new ExamPageQRData('FFPN', 9),
      'Exam_1/exam_12.jpg': new ExamPageQRData('FFPN', 12),
      'Exam_2/exam_3.jpg': new ExamPageQRData('7Q1J', 3),
      'Exam_2/exam_6.jpg': new ExamPageQRData('7Q1J', 6),
      'Exam_2/exam_8.jpg': new ExamPageQRData('7Q1J', 8),
      'Exam_2/exam_9.jpg': new ExamPageQRData('7Q1J', 9),
      'Exam_2/exam_10.jpg': new ExamPageQRData('7Q1J', 10),
      'Exam_2/exam_12.jpg': new ExamPageQRData('7Q1J', 12),
    };
    for (const file in files) {
      const path = `${baseDir}${file}`;
      const result = await parseQR(path);

      assertEquals(result, files[file]);
    }
  },
});

Deno.test({
  name: 'full-page: parseQR finds hard page QR codes correctly after level adjustment',
  ignore: skipIntegration,
  async fn() {
    const baseDir = '../testdata/old_scans/';
    const files: Record<string, ExamPageQRData> = {
      'Exam_1/exam_2.jpg': new ExamPageQRData('FFPN', 2),
      'Exam_1/exam_7.jpg': new ExamPageQRData('FFPN', 7),
      'Exam_1/exam_8.jpg': new ExamPageQRData('FFPN', 8),
      'Exam_1/exam_11.jpg': new ExamPageQRData('FFPN', 11),
      'Exam_2/exam_2.jpg': new ExamPageQRData('7Q1J', 2),
      'Exam_2/exam_4.jpg': new ExamPageQRData('7Q1J', 4),
      'Exam_2/exam_5.jpg': new ExamPageQRData('7Q1J', 5),
      'Exam_2/exam_7.jpg': new ExamPageQRData('7Q1J', 7),
    };
    const tempDir = await Deno.makeTempDir();
    try {
      for (const file in files) {
        const path = `${baseDir}${file}`;
        let result;
        let err = undefined;
        try {
          result = await contrastAdjust(
            path,
            `${tempDir}/${file.replaceAll('/', '_')}`,
            15,
          ).then(p => parseQR(p));
        } catch (e) {
          err = e;
        }

        assertInstanceOf(result, ExamPageQRData, `file ${file}, error: ${err}`);
        assertEquals(result, files[file], `file ${file}: wrong data`);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  },
});

Deno.test({
  name: 'full-page: parseQR fails with broken codes even after enhancement',
  ignore: skipIntegration,
  async fn() {
    const baseDir = '../testdata/old_scans/';
    const files: string[] = [
      'Exam_1/exam_3.jpg',
      'Exam_2/exam_1.jpg',
      'Exam_2/exam_11.jpg',
    ];
    const tempDir = await Deno.makeTempDir();
    try {
      for (const file of files) {
        const path = `${baseDir}${file}`;
        await assertRejects(async () => {
          await parseQR(path);
        });
        await assertRejects(async () => {
          await contrastAdjust(
            path,
            `${tempDir}/${file.replaceAll('/', '_')}`,
            15,
          ).then(p => parseQR(p));
        });
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  },
});
