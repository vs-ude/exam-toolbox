import { getConfig } from '../config/appConfig.ts';
import { ExamToolboxDatabase } from '../services/db.ts';

import {
  createZipArchiveFromDirectory,
  genExamCode,
  mergePdfs,
  sendEmail,
} from '../services/mod.ts';
import { Language } from '../types/mod.ts';

const appConfig = getConfig();

// output from a successful student PDF generation
export interface StudentResult {
  seatNumber: number;
  pdfPathDE: string;
  pdfPathEN: string;
}

// how a mass-exam-generation-job is defined
export interface ExamGenerationJob {
  jobId: string;
  examId: string;
  userEmail: string;
  status: 'queued' | 'processing' | 'finalizing' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  jobDir: string;
  zipPath?: string;
  createdAt: Date;
  studentData: any[];
  examCodes: { de: string; en: string }[];
  studentResults: StudentResult[];
}

// a union type for all possible tasks that a worker can handle
export type GenerationTask =
  | { type: 'student'; [key: string]: any }
  | { type: 'solution'; [key: string]: any }
  | { type: 'log'; [key: string]: any };

export interface RuntimeConfig {
  basePath: string;
  jobsDir: string;
  workerModulePath?: string;
  jobExpirationAgeMs?: number;
  memoryWarningThresholdPercent?: number;
  memoryCheckIntervalMs?: number;
}

export interface RuntimeDeps {
  db: ExamToolboxDatabase;
}

export interface ExamManagerRuntime {
  readonly jobs: Map<string, ExamGenerationJob>;
  readonly taskQueue: GenerationTask[];
  readonly workers: { worker: Worker; isBusy: boolean }[];
  readonly basePath: string;
  readonly jobsDir: string;

  processQueue: () => void;
  finalizeJob: (jobId: string) => Promise<void>;
  getDownloadableJobs: () => Promise<{ examId: string; jobId: string }[]>;
  getActiveJobForExam: (examId: string) => ExamGenerationJob | null;
  scheduleDailyCleanup: () => void;
  genExamCode: (lang: Language, counter: number) => string;
}

export function createExamManagerRuntime(
  config: RuntimeConfig,
  deps: RuntimeDeps,
): ExamManagerRuntime {
  const {
    basePath,
    jobsDir,
    workerModulePath = '../examManager/worker.ts',
    jobExpirationAgeMs = 7 * 24 * 60 * 60 * 1000,
    memoryWarningThresholdPercent = 0.05,
    memoryCheckIntervalMs = 5000,
  } = config;

  const jobs = new Map<string, ExamGenerationJob>();
  const taskQueue: GenerationTask[] = [];

  const logicalCores = navigator.hardwareConcurrency;
  const poolSize = Math.max(1, logicalCores - 1);
  const workers: { worker: Worker; isBusy: boolean }[] = [];

  let lowMemoryWarningLogged = false;

  function processQueue() {
    if (taskQueue.length === 0) return;

    const availableWorker = workers.find(w => !w.isBusy);
    if (!availableWorker) return;

    const task = taskQueue.shift();
    if (!task) return;

    availableWorker.isBusy = true;
    availableWorker.worker.postMessage(task);
  }

  async function prepareFinalOutputDir(
    job: ExamGenerationJob,
  ): Promise<string> {
    const finalOutputDir = `${job.jobDir}/final_output`;
    await Deno.mkdir(finalOutputDir, { recursive: true });
    return finalOutputDir;
  }

  async function mergeStudentPdfs(
    job: ExamGenerationJob,
    finalOutputDir: string,
  ): Promise<void> {
    job.studentResults.sort((a, b) => a.seatNumber - b.seatNumber);
    const sortedGermanPaths = job.studentResults.map(r => r.pdfPathDE);
    const sortedEnglishPaths = job.studentResults.map(r => r.pdfPathEN);
    await mergePdfs(
      sortedGermanPaths.concat(sortedEnglishPaths),
      `${finalOutputDir}/exam_merged.pdf`,
    );
  }

  function buildAttendanceCsv(job: ExamGenerationJob): string {
    let csvContent = 'Sitzplatz,Random,Matrikelnr,Name,Anwesend? (X)\n';
    job.studentData.forEach((student, index) => {
      const seatNumber = index + 1;
      const randoms = job.examCodes[index];
      const randomCode = `${randoms.de}/${randoms.en}`;
      csvContent += `${seatNumber},${randomCode},${student.studentId},"${student.firstName} ${student.lastName}",\n`;
    });
    return csvContent;
  }

  async function writeAttendanceCsv(
    job: ExamGenerationJob,
    finalOutputDir: string,
  ): Promise<void> {
    const csvContent = buildAttendanceCsv(job);
    await Deno.writeTextFile(
      `${finalOutputDir}/anwesenheitsliste.csv`,
      csvContent,
    );
  }

  async function moveFinalArtifacts(
    job: ExamGenerationJob,
    finalOutputDir: string,
  ): Promise<void> {
    const tempOutputDir = `${job.jobDir}/temp_output`;
    await Deno.rename(
      `${tempOutputDir}/exam_solution_de.pdf`,
      `${finalOutputDir}/exam_solution_de.pdf`,
    );
    await Deno.rename(
      `${tempOutputDir}/exam_de.log`,
      `${finalOutputDir}/exam_de.log`,
    );
    await Deno.rename(
      `${tempOutputDir}/exam_en.log`,
      `${finalOutputDir}/exam_en.log`,
    );
  }

  async function createFinalZip(
    job: ExamGenerationJob,
    finalOutputDir: string,
  ): Promise<string> {
    const zipFilePath = `${job.jobDir}/exams_output.zip`;
    await createZipArchiveFromDirectory(finalOutputDir, zipFilePath, [
      '*.pdf',
      '*.log',
      '*.csv',
    ]);
    return zipFilePath;
  }

  async function getExamDisplayData(
    job: ExamGenerationJob,
  ): Promise<{ examName: string; semester?: string }> {
    let examName = 'Exam';
    let semester: string | undefined = undefined;

    try {
      const exam = await deps.db.getExamById(job.examId.trim());

      if (exam?.courseName) {
        examName = exam.courseName;
      }
      if (exam?.semester) {
        semester = exam.semester;
        if (examName !== 'Exam') examName += ` (${semester})`;
      }
    } catch (error) {
      console.error('Error querying exam name:', error);
    }

    return { examName, semester };
  }

  function sendCompletionEmailInBackground(
    job: ExamGenerationJob,
    examName: string,
    semester?: string,
  ): void {
    const downloadUrl = `${appConfig.server.publicUrl}/api/jobs/${job.jobId}/download`;

    sendEmail({
      to: job.userEmail,
      subject: `Exam Ready: ${examName}`,
      html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Exam Generation Complete</h2>
        <p>The exam <strong>"${examName}"</strong> (${semester}) is ready.</p>
        <br/>
        <a href="${downloadUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Download ZIP
        </a>
        <br/><br/>
        <p style="font-size: 0.9em; color: #666;">
          <em>Link not working? Go to Dashboard -> Exams Pool</em>
        </p>
      </div>
      `,
    }).catch(error => {
      console.error(
        `Failed to send completion email for job ${job.jobId} to ${job.userEmail}:`,
        error,
      );
    });
  }

  async function finalizeJobArtifacts(job: ExamGenerationJob): Promise<string> {
    const finalOutputDir = await prepareFinalOutputDir(job);
    await mergeStudentPdfs(job, finalOutputDir);
    await writeAttendanceCsv(job, finalOutputDir);
    await moveFinalArtifacts(job, finalOutputDir);
    return await createFinalZip(job, finalOutputDir);
  }

  async function finalizeJob(jobId: string) {
    const job = jobs.get(jobId);
    if (!job) return;

    if (job.progress.failed > 0) {
      job.status = 'failed';
      console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
      console.error(`Job ${jobId} FAILED during generation phase.`);
      console.error(`${job.progress.failed} tasks failed. Aborting merge.`);
      console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
      return;
    }

    job.status = 'finalizing';
    console.log(`Finalizing job ${jobId}...`);

    try {
      const zipFilePath = await finalizeJobArtifacts(job);
      job.status = 'completed';
      job.zipPath = zipFilePath;

      const { examName, semester } = await getExamDisplayData(job);
      sendCompletionEmailInBackground(job, examName, semester);

      console.log(`Job ${jobId} completed. ZIP at ${zipFilePath}`);
    } catch (error) {
      console.error(`Failed to finalize job ${jobId}:`, error);
      job.status = 'failed';
    }
  }

  async function getDownloadableJobs(): Promise<
    { examId: string; jobId: string }[]
  > {
    const downloadableJobs: { examId: string; jobId: string }[] = [];
    const latestJobs = new Map<string, ExamGenerationJob>();

    for (const job of jobs.values()) {
      if (job.status !== 'completed') continue;
      const existing = latestJobs.get(job.examId);
      if (!existing || job.createdAt > existing.createdAt) {
        latestJobs.set(job.examId, job);
      }
    }

    for (const job of latestJobs.values()) {
      if (!job.zipPath) continue;
      try {
        await Deno.stat(job.zipPath);
        downloadableJobs.push({ examId: job.examId, jobId: job.jobId });
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          console.log(
            `The latest job ${job.jobId} is completed, but its file was not found.`,
          );
        } else {
          console.error(
            `Error checking file status for ${job.zipPath}:`,
            error,
          );
        }
      }
    }

    return downloadableJobs;
  }

  function getActiveJobForExam(examId: string): ExamGenerationJob | null {
    for (const job of jobs.values()) {
      if (
        job.examId === examId &&
        ['queued', 'processing', 'finalizing'].includes(job.status)
      ) {
        return job;
      }
    }
    return null;
  }

  function cleanupOldJobs() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [jobId, job] of jobs.entries()) {
      if (job.status !== 'completed' && job.status !== 'failed') continue;

      const jobAge = now - job.createdAt.getTime();
      if (jobAge > jobExpirationAgeMs) {
        jobs.delete(jobId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(
        `Memory cleanup: Removed ${cleanedCount} old job(s) from the in-memory list.`,
      );
    } else {
      console.log('Memory cleanup: No old jobs to remove.');
    }
  }

  function scheduleDailyCleanup() {
    const now = new Date();
    const nextRun = new Date();

    nextRun.setHours(2, 0, 0, 0);
    if (now > nextRun) nextRun.setDate(nextRun.getDate() + 1);

    const delay = nextRun.getTime() - now.getTime();

    console.log(
      `Next in-memory cleanup scheduled for ${nextRun.toLocaleString()} UTC-Time`,
    );

    setTimeout(() => {
      console.log('Running daily in-memory job cleanup...');
      cleanupOldJobs();
      scheduleDailyCleanup();
    }, delay);
  }

  function monitorMemoryUsage() {
    const hasActiveWorkers = workers.some(w => w.isBusy);
    const isFinalizing = [...jobs.values()].some(
      job => job.status === 'finalizing',
    );

    if (!hasActiveWorkers && !isFinalizing) {
      if (lowMemoryWarningLogged) {
        const memInfo = Deno.systemMemoryInfo();
        const available = (memInfo.available / (1024 * 1024)).toFixed(2);
        const total = (memInfo.total / (1024 * 1024)).toFixed(2);
        console.log(
          `Memory recovered. Available memory is now ${available} MB / ${total} MB.`,
        );
        lowMemoryWarningLogged = false;
      }
      return;
    }

    const memInfo = Deno.systemMemoryInfo();
    const threshold = memInfo.total * memoryWarningThresholdPercent;

    if (memInfo.available < threshold) {
      if (!lowMemoryWarningLogged) {
        const available = (memInfo.available / (1024 * 1024)).toFixed(2);
        const total = (memInfo.total / (1024 * 1024)).toFixed(2);
        console.warn(
          `Memory warning: ${available} MB of ${total} MB remaining.`,
        );
        lowMemoryWarningLogged = true;
      }
    } else if (lowMemoryWarningLogged) {
      const available = (memInfo.available / (1024 * 1024)).toFixed(2);
      const total = (memInfo.total / (1024 * 1024)).toFixed(2);
      console.log(`Memory recovered to ${available} MB / ${total} MB.`);
      lowMemoryWarningLogged = false;
    }
  }

  for (let i = 0; i < poolSize; i++) {
    const worker = new Worker(new URL(workerModulePath, import.meta.url).href, {
      type: 'module',
    });

    worker.onmessage = async e => {
      const result = e.data;
      const wrapper = workers.find(w => w.worker === worker);
      if (wrapper) wrapper.isBusy = false;

      if (!result?.jobId) {
        console.error('Worker message received without a jobId.');
        processQueue();
        return;
      }

      const associatedJob = jobs.get(result.jobId);
      if (!associatedJob || associatedJob.status !== 'processing') {
        processQueue();
        return;
      }

      if (result.status === 'success') {
        associatedJob.progress.completed++;
        if (result.type === 'student') {
          associatedJob.studentResults.push({
            seatNumber: result.seatNumber,
            pdfPathDE: result.pdfPathDE,
            pdfPathEN: result.pdfPathEN,
          });
        }
      } else {
        associatedJob.progress.failed++;
        associatedJob.status = 'failed';
        console.error(
          `Worker task failed for job ${associatedJob.jobId}:`,
          result.error,
        );
      }

      if (
        associatedJob.progress.completed + associatedJob.progress.failed >=
          associatedJob.progress.total &&
        associatedJob.status === 'processing'
      ) {
        await finalizeJob(associatedJob.jobId);
      }

      processQueue();
    };

    worker.onerror = err => {
      console.error('A critical worker error occurred:', err.message);
      const wrapper = workers.find(w => w.worker === worker);
      if (wrapper) wrapper.isBusy = false;
      processQueue();
    };

    workers.push({ worker, isBusy: false });
  }

  console.log(`Worker pool initialized with ${poolSize} workers.`);
  setInterval(monitorMemoryUsage, memoryCheckIntervalMs);

  return {
    jobs,
    taskQueue,
    workers,
    basePath,
    jobsDir,
    processQueue,
    finalizeJob,
    getDownloadableJobs,
    getActiveJobForExam,
    scheduleDailyCleanup,
    genExamCode,
  };
}
