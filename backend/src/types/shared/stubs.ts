import { Exam } from './exam.ts';

export type ExamStub = Omit<Exam, 'tasks' | 'fillPagesAndPoints'>;

/**
 * Lightweight admin view of an exam: metadata only (no tasks), plus a
 * computed total task count. Served by `GET /admin/exams`.
 */
export type AdminExamStub = {
  _id: string;
  courseName: string;
  semester: string;
  date: string;
  updatedAt?: Date;
  lastEditedBy?: string;
  access: { users: string[]; groups?: string[] };
  taskCount: number;
};

export type UserStub = {
  sub: string;
  name: string;
};

export type GroupStub = {
  name: string;
};
