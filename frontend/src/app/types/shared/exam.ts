import { TaskGroup } from './tasks';

export class Exam {
  _id?: string = undefined;
  courseName: string;
  examinerName: string;
  semester: string;
  date: string;
  examLengthMinutes: number;
  tasks: TaskGroup[];
  points?: number;
  pageCount?: number;
  conceptPages?: number;
  public lastEditedBy?: string;
  public updatedAt?: Date;

  constructor(
    courseName?: string,
    examinerName?: string,
    semester?: string,
    date?: string,
    examLengthMinutes?: number,
    tasks?: TaskGroup[],
    _id?: string,
  ) {
    this.courseName = courseName ?? 'placeholder';
    this.examinerName = examinerName ?? 'placeholder';
    this.semester = semester ?? 'placeholder';
    this.date = date ?? 'placeholder';
    this.examLengthMinutes = examLengthMinutes ?? 0;
    this.tasks = tasks ?? [];
  }

  fillPagesAndPoints(this: Exam) {
    this.fillPages();
    this.fillPoints();
  }

  private fillPages(this: Exam) {
    this.pageCount = this.tasks.reduce(
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
    this.conceptPages = this.conceptPages ?? 2;
    this.pageCount += this.conceptPages + 3; // + front + info + back
    if (this.pageCount % 2 != 0) {
      this.conceptPages += 1;
      this.pageCount += 1;
    }
  }

  private fillPoints(this: Exam) {
    this.points = this.tasks.reduce(
      (acc, group) =>
        acc +
        (group.tasks.reduce((acc, task) => acc + (task.points ?? 0), 0) ?? 0),
      0,
    );
  }
}

export const EXAM_FIELDS: (keyof Exam)[] = [
  'courseName',
  'examinerName',
  'semester',
  'date',
  'examLengthMinutes',
  'tasks',
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
