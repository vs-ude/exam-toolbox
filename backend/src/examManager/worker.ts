import { copy } from "@std/fs";

import { compileExam, renderMetaStudent } from "./generation.ts";

// this worker receives a task, generates a single artifact (like a student pdf or a solution), and sends back the result
self.onmessage = async (e: MessageEvent) => {
  const task = e.data;
  const { type, jobId, jobTemplatePath, outputDir } = task;

  const workerTempDir = await Deno.makeTempDir({ prefix: `worker_${type}_` });

  try {
    await copy(jobTemplatePath, workerTempDir, { overwrite: true });

    if (type === "student") {
      const { student, deRandomNumber, enRandomNumber, seatNumber } = task;

      // generates the german pdf first, then modifies the same template to generate the english pdf sequentially
      await renderMetaStudent(
        {
          vollername: `${student.firstName} ${student.lastName}`,
          matrikelnummer: student.studentId,
          zeigeloesung: "no",
          sprache: "de",
          randomexamnumber: deRandomNumber,
          sequenznummer: seatNumber,
        },
        workerTempDir,
      );
      const { pdfBytes: pdfBytesDE } = await compileExam(workerTempDir);
      const pdfPathDE =
        `${outputDir}/student_pdfs/${seatNumber}_${student.studentId}_DE.pdf`;
      await Deno.writeFile(pdfPathDE, pdfBytesDE);

      await renderMetaStudent(
        {
          vollername: `${student.firstName} ${student.lastName}`,
          matrikelnummer: student.studentId,
          zeigeloesung: "no",
          sprache: "en",
          randomexamnumber: enRandomNumber,
          sequenznummer: seatNumber,
        },
        workerTempDir,
      );
      const { pdfBytes: pdfBytesEN } = await compileExam(workerTempDir);
      const pdfPathEN =
        `${outputDir}/student_pdfs/${seatNumber}_${student.studentId}_EN.pdf`;
      await Deno.writeFile(pdfPathEN, pdfBytesEN);

      self.postMessage({
        status: "success",
        type,
        jobId,
        seatNumber,
        pdfPathDE,
        pdfPathEN,
      });
    } else if (type === "solution") {
      await renderMetaStudent(
        {
          vollername: "Max Musterlösung",
          matrikelnummer: 0,
          zeigeloesung: "yes",
          sprache: "de",
        },
        workerTempDir,
      );
      const { pdfBytes } = await compileExam(workerTempDir);
      const solutionPdfPath = `${outputDir}/exam_solution_de.pdf`;
      await Deno.writeFile(solutionPdfPath, pdfBytes);
      self.postMessage({ status: "success", type, jobId, solutionPdfPath });
    } else if (type === "log") {
      const { lang } = task;
      await renderMetaStudent({ sprache: lang }, workerTempDir);
      const { logContent } = await compileExam(workerTempDir);
      const logPath = `${outputDir}/exam_${lang}.log`;
      await Deno.writeTextFile(logPath, logContent);
      self.postMessage({ status: "success", type, jobId, lang, logPath });
    }
  } catch (error) {
    console.error(`Error in worker for task type ${type}:`, error);
    self.postMessage({
      status: "error",
      type,
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    // ensures the temporary directory is always cleaned up to save space
    await Deno.remove(workerTempDir, { recursive: true });
  }
};
