import { TaskGroup } from './tasks.ts';

export class Exam {
  _id?: string = undefined;
  courseName: string;
  examinerName: string;
  bilingual: boolean = false;
  semester: string;
  date: string;
  examLengthMinutes: number;
  tasks: TaskGroup[];
  points?: number;
  pageCount?: number;
  conceptPages?: number;
  public lastEditedBy?: string;
  public updatedAt?: Date;
  access: {
    users: string[];
    groups?: string[];
  };

  constructor(
    courseName?: string,
    examinerName?: string,
    semester?: string,
    date?: string,
    examLengthMinutes?: number,
    tasks?: TaskGroup[],
    access?: { users: string[]; groups?: string[] },
    _id?: string,
  ) {
    this.courseName = courseName ?? '';
    this.examinerName = examinerName ?? '';
    this.semester = semester ?? 'WS 70/71';
    this.date = date ?? '1970-01-01';
    this.examLengthMinutes = examLengthMinutes ?? 0;
    this.tasks = tasks ?? [];
    this.access = access ?? { users: [], groups: [] };
  }

  fillPagesAndPoints(this: Exam) {
    fillPages(this);
    fillPoints(this);
  }
}

function fillPages(exam: Exam) {
  exam.pageCount = exam.tasks.reduce(
    // 1 per task group + number of newPages
    (acc, group) =>
      acc +
      1 +
      (group.tasks.reduce(
        (acc, task) => acc + (task.type === 'newPage' ? 1 : 0),
        0,
      ) ?? 0),
    0,
  );
  exam.conceptPages = exam.conceptPages ?? 2;
  exam.pageCount += exam.conceptPages + 3; // + front + info + back
  if (exam.pageCount % 2 != 0) {
    exam.conceptPages += 1;
    exam.pageCount += 1;
  }
}

function fillPoints(exam: Exam) {
  exam.points = exam.tasks.reduce(
    (acc, group) =>
      acc +
      (group.tasks.reduce((acc, task) => acc + (task.points ?? 0), 0) ?? 0),
    0,
  );
}

export const EXAM_FIELDS: (keyof Exam)[] = [
  'courseName',
  'examinerName',
  'semester',
  'date',
  'examLengthMinutes',
  'tasks',
  'access',
];

/**
 * Parses an arbitrary object into an {@link Exam} instance, validating that
 * all required fields are present. Throws if validation fails.
 */
export function parseExam(raw: unknown): Exam {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Exam must be a non-null object');
  }

  const obj = raw as Record<string, unknown>;
  const missing = EXAM_FIELDS.filter(f => !(f in obj));

  if (missing.length > 0) {
    throw new Error(`Exam is missing required fields: ${missing.join(', ')}.`);
  }

  return Object.assign(new Exam(), obj);
}
