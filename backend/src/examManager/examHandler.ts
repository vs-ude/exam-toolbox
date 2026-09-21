import { Context } from '@hono/hono';
import { read, utils } from '@mirror/xlsx';
import { crypto } from '@std/crypto';
import { encodeHex } from '@std/encoding';
import * as fs from '@std/fs';

import { ensureQRCache } from '../services/qr.ts';
import { AppEnv } from '../types/context.ts';
import { HandlerResult, HttpError } from '../types/handler.ts';
import { Exam, Student, User } from '../types/mod.ts';

import {
  compileExam,
  generateSolution,
  generateTasksLatex,
  renderMetaExam,
} from './generation.ts';
import { ExamManagerDeps } from './main.ts';
import { ExamGenerationJob } from './runtime.ts';

export async function getAllExams(
  _c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const user = _c.get('jwtPayload') as User;
  const examList = await deps.db.getAllExams(user);
  return { kind: 'json', status: 200, body: examList };
}

export async function getRecentExams(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const user = c.get('jwtPayload') as User;
  const recentExams = await deps.db.getRecentExams(user, 8);
  return { kind: 'json', status: 200, body: recentExams };
}

export async function getExamById(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const user = c.get('jwtPayload') as User;
  const examId = c.req.param('id')!;
  const exam = await deps.db.getExamById(examId, user);
  if (!exam) {
    throw new HttpError(404, 'Exam not found');
  }
  return { kind: 'json', status: 200, body: exam };
}

export async function searchExams(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const user = c.get('jwtPayload') as User;
  const searchText = c.req.param('searchText')!;
  const examList = await deps.db.searchExams(searchText, user);
  return { kind: 'json', status: 200, body: examList };
}

export async function downloadFile(
  c: Context<AppEnv>,
  _deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const fileUrl = c.req.query('fileUrl');
  if (!fileUrl) {
    throw new HttpError(400, 'File URL is required');
  }

  let fileContent: Uint8Array;
  try {
    fileContent = await Deno.readFile(fileUrl);
  } catch (error: unknown) {
    console.error('Error reading file:', error);
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Error reading file: ${msg}`);
  }

  const fileName = fileUrl.split('/').pop() || 'downloaded_file';
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  let contentType = 'application/octet-stream';
  switch (fileExtension) {
    case 'pdf':
      contentType = 'application/pdf';
      break;
    case 'jpg':
    case 'jpeg':
      contentType = 'image/jpeg';
      break;
    case 'png':
      contentType = 'image/png';
      break;
    default:
      contentType = 'application/octet-stream';
  }

  return { kind: 'binary', content: fileContent, contentType, fileName };
}

export function getJobStatus(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): HandlerResult {
  const jobId = c.req.param('jobId')!;
  const job = deps.jobs.get(jobId);
  if (!job) {
    throw new HttpError(404, 'Job not found');
  }
  return {
    kind: 'json',
    status: 200,
    body: {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      downloadUrl:
        job.status === 'completed' ? `/api/jobs/${jobId}/download` : null,
    },
  };
}

export async function downloadJob(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const jobId = c.req.param('jobId')!;
  const job = deps.jobs.get(jobId);
  if (!job) {
    throw new HttpError(404, 'Job not found');
  }
  if (job.userEmail !== c.get('jwtPayload').email) {
    throw new HttpError(403, 'Forbidden');
  }
  if (job.status !== 'completed' || !job.zipPath) {
    throw new HttpError(400, 'Job is not yet complete or the file is missing.');
  }

  let zipFileBytes: Uint8Array;
  try {
    zipFileBytes = await Deno.readFile(job.zipPath);
  } catch (error) {
    console.error(`Error sending zip file for job ${jobId}:`, error);
    throw new Error('Error reading the generated file.');
  }

  return {
    kind: 'binary',
    content: zipFileBytes,
    contentType: 'application/zip',
    fileName: `exams_${jobId}.zip`,
  };
}

export async function getDownloadableJobs(
  _c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const downloadableJobs = await deps.getDownloadableJobs();
  return { kind: 'json', status: 200, body: downloadableJobs };
}

export function getActiveJob(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): HandlerResult {
  const examId = c.req.param('examId')!;
  let activeJob = null;

  for (const job of deps.jobs.values()) {
    if (
      job.examId === examId &&
      ['queued', 'processing', 'finalizing'].includes(job.status)
    ) {
      activeJob = job;
      break;
    }
  }

  if (activeJob) {
    return {
      kind: 'json',
      status: 200,
      body: {
        jobId: activeJob.jobId,
        status: activeJob.status,
        progress: activeJob.progress,
      },
    };
  }
  return { kind: 'json', status: 200, body: null };
}

export async function createExam(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const exam: Exam = await c.req.json();
  const result = await deps.db.createExam(exam, c.get('jwtPayload'));
  return {
    kind: 'json',
    status: 200,
    body: { message: 'Exam saved successfully! ', insertedId: result },
  };
}

export async function generatePreview(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const exam: Exam = Object.assign(new Exam(), await c.req.json());
  const tempDir = await Deno.makeTempDir({ prefix: 'exam_gen_single_' });
  exam.fillMeta();
  await ensureQRCache(1, exam.pageCount!);
  await fs.copy(deps.basePath, tempDir, { overwrite: true });
  await generateSolution(tempDir, exam);

  const { pdfBytes: examPDF, logContent } = await compileExam(tempDir);

  const subtaskInfo = deps.parseLogFileForSubtaskInfo(logContent);
  const subtaskInfoJson = JSON.stringify(subtaskInfo);

  return {
    kind: 'binary',
    content: examPDF,
    contentType: 'application/pdf',
    fileName: `${exam.courseName}.pdf`,
    extraHeaders: {
      'X-Subtask-Info': subtaskInfoJson,
      'Access-Control-Expose-Headers': 'X-Subtask-Info',
    },
  };
}

export async function uploadFile(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const formData = await c.req.formData();
  console.log(formData);
  const file: File = formData.get('image') as File;

  if (!file || file.size === 0) {
    throw new HttpError(400, 'No or empty file uploaded');
  }

  const data = await file.bytes();
  const fileHashBuffer = await crypto.subtle.digest('SHA-256', data);
  const fileHash = encodeHex(fileHashBuffer);
  const ext = file.name?.split('.').pop();
  const hashedFileName = ext ? `${fileHash}.${ext}` : fileHash;
  const uploadDir = './uploads';
  const filePath = `${uploadDir}/${hashedFileName}`;
  await Deno.mkdir(uploadDir, { recursive: true });
  await Deno.writeFile(filePath, data);

  const fileTrackerEntry: Record<string, unknown> = {
    name: file.name,
    refs: [],
    timeToLive: 7,
  };
  try {
    await deps.db.createFileTrackerEntry(fileTrackerEntry);
    console.log('File tracker entry created:', fileTrackerEntry);
  } catch (error) {
    console.error('Error inserting file tracker entry:', error);
    throw new Error('Error inserting file tracker entry');
  }

  return {
    kind: 'json',
    status: 200,
    body: {
      message: 'File uploaded successfully',
      url: `./uploads/${hashedFileName}`,
    },
  };
}

export async function generateExams(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const formData = await c.req.formData();
  const examJson = JSON.parse(formData.get('exam')!.toString());
  const exam: Exam = Object.assign(new Exam(), examJson);
  const startSeatNumber = parseInt(
    formData.get('startSeatNumber')?.toString() || '1',
    10,
  );
  const file = formData.get('list') as File;
  if (!file || !exam || file.size == 0 || !exam._id) {
    throw new HttpError(
      400,
      'Missing file, file content, exam data or exam id',
    );
  }

  const examId = exam._id;

  for (const [jobId, existingJob] of deps.jobs.entries()) {
    if (existingJob.examId === examId) {
      if (['processing', 'queued', 'finalizing'].includes(existingJob.status)) {
        console.log(
          `Blocked new job request for exam ${examId} because job ${existingJob.jobId} is already active.`,
        );
        throw new HttpError(
          409,
          'A generation job for this exam is already in progress. Please wait for it to complete.',
        );
      }
      console.log(
        `Found old, finished job ${existingJob.jobId} (status: ${existingJob.status}) for exam ${examId}. Replacing it.`,
      );
      await Deno.remove(existingJob.jobDir, { recursive: true }).catch(err => {
        console.error(
          `Error cleaning up old job directory ${existingJob.jobId}:`,
          err,
        );
      });
      deps.jobs.delete(jobId);
      break;
    }
  }

  const jobId = crypto.randomUUID();
  const jobDir = `${deps.JOBS_DIR}/${jobId}`;
  const tempOutputDir = `${jobDir}/temp_output`;
  const studentPdfDir = `${tempOutputDir}/student_pdfs`;
  await Deno.mkdir(studentPdfDir, { recursive: true });

  const jobTemplatePath = await Deno.makeTempDir({
    prefix: 'exam_template_',
    dir: jobDir,
  });

  exam.fillMeta();
  await fs.copy(deps.basePath, jobTemplatePath, { overwrite: true });
  await renderMetaExam(exam, jobTemplatePath);
  await generateTasksLatex(
    exam,
    jobTemplatePath,
    `${jobTemplatePath}/aufgaben.tex`,
    { solution: false },
  );

  const workbook = read(await file.arrayBuffer());
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const studentData = utils
    .sheet_to_json(worksheet, {
      header: [
        'examPlanId',
        'examNumber',
        'examTitle',
        'lastName',
        'firstName',
        'studentId',
      ],
      range: 5,
    })
    .filter((student: unknown) => {
      const s = student as Record<string, unknown>;
      return s.firstName && s.lastName;
    });
  const qrCachePromise = ensureQRCache(studentData.length, exam.pageCount!);

  const totalTasks = studentData.length + 3;

  const newJob: ExamGenerationJob = {
    jobId,
    examId,
    userEmail: c.get('jwtPayload').email,
    status: 'processing',
    progress: { total: totalTasks, completed: 0, failed: 0 },
    jobDir,
    createdAt: new Date(),
    studentData,
    examCodes: [],
    studentResults: [],
  };

  let placeholderStudentID = 1000000;
  studentData.forEach((studentLine: unknown, index: number) => {
    const studentLineData = studentLine as Record<string, unknown>;
    const seatNumber = index + startSeatNumber;
    const deExamCode = deps.genExamCode('A', seatNumber);
    const enExamCode = deps.genExamCode('B', seatNumber);

    const student = new Student(
      `${studentLineData.firstName} ${studentLineData.lastName}`,
      String(
        studentLineData.studentId !== ''
          ? studentLineData.studentId
          : placeholderStudentID++,
      ),
      {
        A: deExamCode,
        B: enExamCode,
      },
      seatNumber,
    );

    newJob.examCodes.push({ de: deExamCode, en: enExamCode });
    deps.taskQueue.push({
      type: 'student',
      jobId,
      exam,
      student,
      jobTemplatePath,
      outputDir: tempOutputDir,
      deRandomNumber: deExamCode,
      enRandomNumber: enExamCode,
      seatNumber,
    });
  });

  deps.taskQueue.push({
    type: 'log',
    jobId,
    jobTemplatePath,
    outputDir: tempOutputDir,
    lang: 'de',
  });
  deps.taskQueue.push({
    type: 'log',
    jobId,
    jobTemplatePath,
    outputDir: tempOutputDir,
    lang: 'en',
  });

  const solutionJobTemplatePath = await Deno.makeTempDir({
    prefix: 'exam_template_solution_',
    dir: jobDir,
  });

  await fs.copy(deps.basePath, solutionJobTemplatePath, { overwrite: true });

  deps.taskQueue.push({
    type: 'solution',
    exam,
    jobId,
    jobTemplatePath: solutionJobTemplatePath,
    outputDir: tempOutputDir,
  });

  deps.jobs.set(jobId, newJob);

  await qrCachePromise;
  deps.workers.forEach(() => deps.processQueue());

  return {
    kind: 'json',
    status: 202,
    body: { jobId, message: 'Exam generation job has been started.' },
  };
}

export async function upsertExam(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const user = c.get('jwtPayload');
  const examData = await c.req.json();
  let action: 'created' | 'updated' = 'updated';
  if (!examData) {
    throw new HttpError(400, 'Exam data required');
  }
  let examId = c.req.param('examId');
  if (!examId) {
    delete examData._id;
    examId = await deps.db.createExam(examData, user);
    action = 'created';
  } else {
    examData._id = examId;

    try {
      await deps.db.updateExam(examId, examData, user);
    } catch (_) {
      throw new HttpError(404, 'Exam not found');
    }
  }
  return {
    kind: 'json',
    status: 200,
    body: { insertedId: examId, message: `Exam ${action} successfully` },
  };
}

export async function clearExams(
  _c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const result = await deps.db.clearExams();
  return {
    kind: 'json',
    status: 200,
    body: {
      message: `${result} exams deleted successfully!`,
      deletedCount: result,
    },
  };
}

export async function deleteExam(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const user = c.get('jwtPayload') as User;
  const id = c.req.param('examId')!;
  if (!id) {
    throw new HttpError(400, 'Exam ID is required');
  }
  const result = await deps.db.deleteExam(id, user);
  if (result === 0) {
    throw new HttpError(404, 'Exam not found');
  }
  console.log(`Exam ${id} deleted.`);
  return {
    kind: 'json',
    status: 200,
    body: { message: 'Exam deleted successfully' },
  };
}

export async function cancelJob(
  c: Context<AppEnv>,
  deps: ExamManagerDeps,
): Promise<HandlerResult> {
  const jobId = c.req.param('jobId')!;
  const job = deps.jobs.get(jobId);

  if (!job) {
    throw new HttpError(404, 'Job not found');
  }

  if (job.status === 'processing' || job.status === 'queued') {
    console.log(`Cancellation requested for job: ${jobId}`);
    job.status = 'failed';

    // Mutate in-place to avoid reassigning the shared reference
    deps.taskQueue.splice(
      0,
      deps.taskQueue.length,
      ...deps.taskQueue.filter(t => t.jobId !== jobId),
    );

    await Deno.remove(job.jobDir, { recursive: true }).catch(err => {
      console.error(
        `Error during immediate cleanup for cancelled job ${jobId}:`,
        err,
      );
    });

    return {
      kind: 'json',
      status: 200,
      body: { message: `Job ${jobId} has been cancelled.` },
    };
  }

  throw new HttpError(
    400,
    `Job ${jobId} cannot be cancelled as it is already ${job.status}.`,
  );
}
