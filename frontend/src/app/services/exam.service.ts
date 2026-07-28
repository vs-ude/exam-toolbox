import { Exam, parseExam } from '../types/shared/exam';
import { ApiService } from './api.service';

export function newDefaultExam(api: ApiService): Exam {
  const user = api.getUserOnce();
  const exam = new Exam();
  exam.semester = '';
  exam.examLengthMinutes = 90;
  if (user) {
    exam.access.users.push(user.sub);
  }
  return exam;
}

/**
 * Returns a deep clone of the exam with all temporary placeholder IDs
 * (prefixed with "tmp_") removed from tasks before submission to the backend.
 */
export function removePlaceholderIds(exam: Exam): Exam {
  const clone: Exam = parseExam(JSON.parse(JSON.stringify(exam)));
  for (const group of clone.tasks) {
    for (const task of group.tasks) {
      if (task._id?.startsWith('tmp_')) {
        delete task._id;
      }
    }
  }
  return clone;
}

/**
 * Returns a list of upcoming semesters based on the current date.
 */
export function getSemesters(): string[] {
  const currentDate = new Date();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const fmt = (y: number) => y.toString().slice(-2);

  if (month >= 10 || month <= 3) {
    return [
      `WS ${fmt(year)}/${fmt(year + 1)}`,
      `SS ${fmt(year + 1)}`,
      `WS ${fmt(year + 1)}/${fmt(year + 2)}`,
    ];
  } else {
    return [
      `SS ${fmt(year)}`,
      `WS ${fmt(year)}/${fmt(year + 1)}`,
      `SS ${fmt(year + 1)}`,
    ];
  }
}
