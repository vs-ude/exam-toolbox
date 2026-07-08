import { copy } from '@std/fs';

import {
  compileExam,
  generateSolution,
  renderMetaStudent,
} from './generation.ts';
import { generateExamQR } from '../services/qr.ts';
import { Student } from '../types/student.ts';

// this worker receives a task, generates a single artifact (like a student pdf or a solution), and sends back the result
self.onmessage = async (e: MessageEvent) => {
  const task = e.data;
  const { type, jobId, jobTemplatePath, outputDir } = task;

  const workerTempDir = await Deno.makeTempDir({ prefix: `worker_${type}_` });

  try {
    await copy(jobTemplatePath, workerTempDir, { overwrite: true });

    if (type === 'student') {
      const { exam, student } = task;

      // generates the german pdf first, then modifies the same template to generate the english pdf sequentially
      await renderMetaStudent(
        student,
        {
          zeigeloesung: 'no',
          sprache: 'DE',
        },
        workerTempDir,
      );
      await generateExamQR(
        `${workerTempDir}/img/mainQr.png`,
        exam,
        'DE',
        student.codes.DE,
      );
      const { pdfBytes: pdfBytesDE } = await compileExam(workerTempDir);
      const pdfPathDE = `${outputDir}/student_pdfs/${student.sequenceNumber}_${student.matriculation}_DE.pdf`;
      await Deno.writeFile(pdfPathDE, pdfBytesDE);

      await renderMetaStudent(
        student,
        {
          zeigeloesung: 'no',
          sprache: 'EN',
        },
        workerTempDir,
      );
      const { pdfBytes: pdfBytesEN } = await compileExam(workerTempDir);
      const pdfPathEN = `${outputDir}/student_pdfs/${student.sequenceNumber}_${student.matriculation}_EN.pdf`;
      await Deno.writeFile(pdfPathEN, pdfBytesEN);

      self.postMessage({
        status: 'success',
        type,
        jobId,
        seatNumber: student.sequenceNumber,
        pdfPathDE,
        pdfPathEN,
      });
    } else if (type === 'solution') {
      const { exam } = task;
      await generateSolution(workerTempDir, exam);
      const { pdfBytes } = await compileExam(workerTempDir);
      const solutionPdfPath = `${outputDir}/exam_solution_de.pdf`;
      await Deno.writeFile(solutionPdfPath, pdfBytes);
      self.postMessage({ status: 'success', type, jobId, solutionPdfPath });
    } else if (type === 'log') {
      const { lang } = task;
      await renderMetaStudent(new Student(), { sprache: lang }, workerTempDir);
      const { logContent } = await compileExam(workerTempDir);
      const logPath = `${outputDir}/exam_${lang}.log`;
      await Deno.writeTextFile(logPath, logContent);
      self.postMessage({ status: 'success', type, jobId, lang, logPath });
    }
  } catch (error) {
    console.error(`Error in worker for task type ${type}:`, error);
    self.postMessage({
      status: 'error',
      type,
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    // ensures the temporary directory is always cleaned up to save space
    await Deno.remove(workerTempDir, { recursive: true });
  }
};
