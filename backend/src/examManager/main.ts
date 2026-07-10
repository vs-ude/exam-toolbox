import { ExamToolboxDatabase } from '../services/db.ts';
import { Language } from '../types/mod.ts';

import { ExamGenerationJob, GenerationTask } from './runtime.ts';

export interface ExamManagerDeps {
  db: ExamToolboxDatabase;
  jobs: Map<string, ExamGenerationJob>;
  taskQueue: GenerationTask[];
  workers: { worker: Worker; isBusy: boolean }[];
  basePath: string;
  JOBS_DIR: string;
  processQueue: () => void;
  genExamCode: (lang: Language, counter: number) => string;
  getDownloadableJobs: () => Promise<{ examId: string; jobId: string }[]>;
  parseLogFileForSubtaskInfo: (logContent: string) => unknown[];
}

export * from './examHandler.ts';
export * from './tagHandler.ts';
export * from './taskPoolHandler.ts';
