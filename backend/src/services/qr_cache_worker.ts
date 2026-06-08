import { type Language } from "../types/exam.ts";
import { genRandomNumber } from "./random_code.ts";
import { generatePageQR } from "./qr.ts";

type WarmupMessage = {
  cacheDir: string;
  studentsPerLanguage: number;
  pagesPerStudent: number;
  languages: Language[];
};

self.onmessage = async (e: MessageEvent<WarmupMessage>) => {
  const { cacheDir, studentsPerLanguage, pagesPerStudent, languages } = e.data;

  try {
    let generatedCount = 0;

    for (const language of languages) {
      for (
        let studentNumber = 1;
        studentNumber <= studentsPerLanguage;
        studentNumber++
      ) {
        for (let pageNumber = 1; pageNumber <= pagesPerStudent; pageNumber++) {
          const examCode = genRandomNumber(language, studentNumber);
          const path = `${cacheDir}/${examCode}_${pageNumber}.png`;

          await generatePageQR(path, examCode, pageNumber);
          generatedCount++;
        }
      }
      for (let pageNumber = 1; pageNumber <= pagesPerStudent; pageNumber++) {
        const examCode = "R4ND";
        const path = `${cacheDir}/${examCode}_${pageNumber}.png`;

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
