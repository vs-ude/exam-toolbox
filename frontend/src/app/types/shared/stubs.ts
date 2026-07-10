import { Exam } from './exam';

export type ExamStub = Omit<Exam, 'tasks'>;

export type UserStub = {
  sub: string;
  name: string;
};
