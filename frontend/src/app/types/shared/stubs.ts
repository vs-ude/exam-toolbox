import { Exam } from './exam';

export type ExamStub = Omit<Exam, 'tasks' | 'fillPagesAndPoints'>;

export type UserStub = {
  sub: string;
  name: string;
};
