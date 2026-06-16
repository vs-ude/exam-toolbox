import { QRConfig } from "../config/mod.ts";
import { type Language } from "../types/exam.ts";
import { genExamCode } from "./exam_code.ts";
import { generatePageQR } from "./qr.ts";

type WarmupMessage = {
  startStudentNumber?: number;
  studentsPerLanguage: number;
  pagesPerStudent: number;
  languages: Language[];
};

self.onmessage = async (e: MessageEvent<WarmupMessage>) => {
  const {
    startStudentNumber = 1,
    studentsPerLanguage,
    pagesPerStudent,
    languages,
  } = e.data;

  try {
    let generatedCount = 0;

    for (const language of languages) {
      for (
        let studentNumber = startStudentNumber;
        studentNumber <= studentsPerLanguage;
        studentNumber++
      ) {
        for (let pageNumber = 1; pageNumber <= pagesPerStudent; pageNumber++) {
          const examCode = genExamCode(language, studentNumber);
          const path = `${QRConfig.cachePath}/${examCode}_${pageNumber}.png`;

          await generatePageQR(path, examCode, pageNumber);
          generatedCount++;
        }
      }
      for (let pageNumber = 1; pageNumber <= pagesPerStudent; pageNumber++) {
        const examCode = "R4ND";
        const path = `${QRConfig.cachePath}/${examCode}_${pageNumber}.png`;

        await generatePageQR(path, examCode, pageNumber);
        generatedCount++;
      }
    }

    self.postMessage({ status: "success", generatedCount });
  } catch (error) {
    self.postMessage({
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
