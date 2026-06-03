import { assertEquals, assertInstanceOf, assertRejects } from "@std/assert";
import { generateExamQR, generatePageQR, parseQR, QRError } from "./qr.ts";
import { Exam } from "../types/exam.ts";
import { ExamPageScan, ExamScan } from "../types/scan.ts";
import { skipIntegration } from "../config/test.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeExam(
  overrides?: Partial<
    { points: number | undefined; pageCount: number | undefined }
  >,
): Exam {
  const exam = new Exam(
    "Testlauf vong Exascan 2",
    "Prof. Tester",
    "WS 2016/17",
    "2017-02-10",
    90,
    [],
  );
  exam.points = "points" in (overrides ?? {}) ? overrides!.points : 157;
  exam.pageCount = "pageCount" in (overrides ?? {}) ? overrides!.pageCount : 12;
  return exam;
}

// ---------------------------------------------------------------------------
// generateExamQR – input validation (no file I/O needed, throws before generate())
// ---------------------------------------------------------------------------

Deno.test("generateExamQR throws QRError when points is invalid", async () => {
  await assertRejects(
    () =>
      generateExamQR(
        "/tmp/irrelevant.png",
        makeExam({ points: -5 }),
        "DE",
        "FFPN",
      ),
    QRError,
  );
});

Deno.test("generateExamQR throws QRError when pageCount is invalid", async () => {
  await assertRejects(
    () =>
      generateExamQR(
        "/tmp/irrelevant.png",
        makeExam({ pageCount: 2 }),
        "DE",
        "FFPN",
      ),
    QRError,
  );
});

// ---------------------------------------------------------------------------
// integration tests
// ---------------------------------------------------------------------------

Deno.test({
  name: "generateExamQR returns the expected content string (EN)",
  ignore: skipIntegration,
  async fn() {
    const tmpDir = await Deno.makeTempDir();
    try {
      const content = await generateExamQR(
        `${tmpDir}/qr.png`,
        makeExam(),
        "EN",
        "FFPN",
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
  name: "generateExamQR returns the expected content string (DE)",
  ignore: skipIntegration,
  async fn() {
    const tmpDir = await Deno.makeTempDir();
    try {
      const content = await generateExamQR(
        `${tmpDir}/qr.png`,
        makeExam(),
        "DE",
        "ABCD",
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
  name: "generatePageQR returns the expected content string",
  ignore: skipIntegration,
  async fn() {
    const tmpDir = await Deno.makeTempDir();
    try {
      const content = await generatePageQR(`${tmpDir}/qr.png`, "FFPN", 4);
      assertEquals(content, "{'p':4,'r':'FFPN'}");
    } finally {
      await Deno.remove(tmpDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "generatePageQR returns the expected content string for page 5",
  ignore: skipIntegration,
  async fn() {
    const tmpDir = await Deno.makeTempDir();
    try {
      const content = await generatePageQR(`${tmpDir}/qr.png`, "FFPN", 5);
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
  name: "round-trip: generateExamQR → parseQR returns matching ExamScan",
  ignore: skipIntegration,
  async fn() {
    const tmpDir = await Deno.makeTempDir();
    try {
      const exam = makeExam();
      const path = `${tmpDir}/exam.png`;
      await generateExamQR(path, exam, "EN", "FFPN");

      const result = await parseQR(path);

      assertInstanceOf(result, ExamScan);
      assertEquals(result.courseName, "Testlauf vong Exascan 2");
      assertEquals(result.semester, "WS 2016/17");
      assertEquals(result.date, "2017-02-10");
      assertEquals(result.language, "EN");
      assertEquals(result.pageCount, 12);
      assertEquals(result.points, 157);
      assertEquals(result.code, "FFPN");
    } finally {
      await Deno.remove(tmpDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "round-trip: generateExamQR → parseQR with DE language",
  ignore: skipIntegration,
  async fn() {
    const tmpDir = await Deno.makeTempDir();
    try {
      const path = `${tmpDir}/exam_de.png`;
      await generateExamQR(path, makeExam(), "DE", "XYZT");

      const result = await parseQR(path);

      assertInstanceOf(result, ExamScan);
      assertEquals(result.language, "DE");
      assertEquals(result.code, "XYZT");
    } finally {
      await Deno.remove(tmpDir, { recursive: true });
    }
  },
});

Deno.test({
  name:
    "round-trip: generatePageQR → parseQR returns matching ExamPageScan (page 4)",
  ignore: skipIntegration,
  async fn() {
    const tmpDir = await Deno.makeTempDir();
    try {
      const path = `${tmpDir}/page4.png`;
      await generatePageQR(path, "FFPN", 4);

      const result = await parseQR(path);

      assertInstanceOf(result, ExamPageScan);
      assertEquals(result.code, "FFPN");
      assertEquals(result.page, 4);
    } finally {
      await Deno.remove(tmpDir, { recursive: true });
    }
  },
});

Deno.test({
  name:
    "round-trip: generatePageQR → parseQR returns matching ExamPageScan (page 5)",
  ignore: skipIntegration,
  async fn() {
    const tmpDir = await Deno.makeTempDir();
    try {
      const path = `${tmpDir}/page5.png`;
      await generatePageQR(path, "FFPN", 5);

      const result = await parseQR(path);

      assertInstanceOf(result, ExamPageScan);
      assertEquals(result.code, "FFPN");
      assertEquals(result.page, 5);
    } finally {
      await Deno.remove(tmpDir, { recursive: true });
    }
  },
});

Deno.test({
  name: "round-trip: generatePageQR → parseQR for multiple pages",
  ignore: skipIntegration,
  async fn() {
    const tmpDir = await Deno.makeTempDir();
    try {
      for (const page of [1, 2, 6, 10, 99]) {
        const path = `${tmpDir}/page_${page}.png`;
        await generatePageQR(path, "ABCD", page);

        const result = await parseQR(path);

        assertInstanceOf(result, ExamPageScan);
        assertEquals(result.code, "ABCD", `page ${page}: wrong code`);
        assertEquals(result.page, page, `page ${page}: wrong page number`);
      }
    } finally {
      await Deno.remove(tmpDir, { recursive: true });
    }
  },
});
