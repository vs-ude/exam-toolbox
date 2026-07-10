import { Exam } from './exam.ts';

export type ExamStub = Omit<Exam, 'tasks'>;

export type UserStub = {
  sub: string;
  name: string;
};
