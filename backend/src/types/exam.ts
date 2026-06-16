import type { Tag } from "./tag.ts";

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
    this.courseName = courseName ?? "placeholder";
    this.examinerName = examinerName ?? "placeholder";
    this.semester = semester ?? "placeholder";
    this.date = date ?? "placeholder";
    this.examLengthMinutes = examLengthMinutes ?? 0;
    this.tasks = tasks ?? [];
  }

  fillPagesAndPoints(this: Exam) {
    this.fillPages();
    this.fillPoints();
  }

  private fillPages(this: Exam) {
    this.pageCount = this.tasks.reduce( // 1 per task group + number of newPages
      (acc, group) =>
        acc + 1 +
        (group.tasks.reduce(
          (acc, task) => acc + (task.type === "newPage" ? 1 : 0),
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

export interface TaskGroup {
  groupNumber: number;
  groupTitle: Translation;
  tasks: Task[];
  points?: number;
}

export type Task =
  | MultipleChoiceTask
  | PropertyTask
  | ShortAnswerTask
  | PictureTask
  | LatexTask
  | TableTask
  | ManualText
  | NewPage;

export interface BaseTask {
  taskId: string;
  type: TaskType;
  question: Question;
  points: number;
  tagIds: string[];
  tags: Tag[];
  createdBy: string;
  createdAt: Date;
  lastUsed: Date;
  usedIn: string[];
  parent?: string;
  children: string[];
}

export type Language = keyof Translation;

export interface Dimension {
  unit: "cm" | "mm" | "relative";
  dimension: "width" | "height";
  scalar: number;
}

export interface Question {
  DE: string;
  EN: string;
}

export interface MultipleChoiceTask extends BaseTask {
  type: "multipleChoice";
  numCorrect?: number;
  answerOptions: AnswerOptions[];
}

export interface AnswerOptions {
  DE: string;
  EN: string;
  correct: boolean;
}

export interface PropertyTask extends BaseTask {
  type: "property";
  header: Translation[];
  lines: PropertyLine[];
}

export interface PropertyLine {
  options: boolean[];
  text: Translation;
}

export interface ShortAnswerTask extends BaseTask {
  type: "shortAnswer";
  noLines?: number;
  solution: Translation;
}

export interface PictureTask extends BaseTask {
  type: "pictureTask";
  questionPicture: Image;
  solutionPicture: Image;
  size?: Dimension;
}

export interface Image {
  urlDE: string;
  urlEN: string;
  altTextDE?: string;
  altTextEN?: string;
}

export interface LatexTask extends BaseTask {
  type: "latex";
  questionLatex: Translation;
}

export interface TableTask extends BaseTask {
  type: "table";
  tableHeadersQuestion: Translation[];
  tableDataQuestion: Translation[][];
  tableHeadersSolution: Translation[];
  tableDataSolution: Translation[][];
}

export interface ManualText extends BaseTask {
  type: "manualText";
  points: 0; // Manual texts do not have points
}

export interface NewPage extends BaseTask {
  type: "newPage";
  points: 0; // New pages do not have points
}

const TASK_TYPES = [
  "multipleChoice",
  "property",
  "shortAnswer",
  "pictureTask",
  "latex",
  "table",
  "manualText",
  "newPage",
] as const;

type TaskType = (typeof TASK_TYPES)[number];

/** Required fields per task type beyond {@link BaseTask}. */
const TASK_TYPE_FIELDS: Record<TaskType, string[]> = {
  multipleChoice: ["answerOptions"],
  property: ["header", "lines"],
  shortAnswer: ["solution"],
  pictureTask: ["questionPicture", "solutionPicture"],
  latex: ["questionLatex"],
  table: [
    "tableHeadersQuestion",
    "tableDataQuestion",
    "tableHeadersSolution",
    "tableDataSolution",
  ],
  manualText: [],
  newPage: [],
};

const BASE_TASK_FIELDS: (keyof BaseTask)[] = [
  "taskId",
  "type",
  "question",
  "points",
  "tagIds",
  "createdBy",
];

const EXAM_FIELDS: (keyof Exam)[] = [
  "courseName",
  "examinerName",
  "semester",
  "date",
  "examLengthMinutes",
  "tasks",
];

/**
 * Parses an arbitrary object into an {@link Exam} instance, validating that
 * all required fields are present. Throws if validation fails.
 */
export function parseExam(raw: unknown): Exam {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Exam must be a non-null object");
  }

  const obj = raw as Record<string, unknown>;
  const missing = EXAM_FIELDS.filter((f) => !(f in obj));

  if (missing.length > 0) {
    throw new Error(
      `Exam is missing required fields: ${missing.join(", ")}.`,
    );
  }

  return Object.assign(new Exam(), obj);
}

/**
 * Parses an arbitrary object into the most specific {@link Task} type using
 * the `type` discriminant field. Throws if the type is unknown or required
 * fields are missing.
 */
export function parseTask(raw: unknown): Task {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Task must be a non-null object");
  }

  const obj = raw as Record<string, unknown>;
  if (!("type" in obj)) throw new Error("Task must have a type");
  const type = obj["type"];

  if (!TASK_TYPES.includes(type as TaskType)) {
    throw new Error(
      `Unknown task type: ${JSON.stringify(type)}. Expected one of: ${
        TASK_TYPES.join(", ")
      }.`,
    );
  }

  const taskType = type as TaskType;
  const missing: string[] = [];

  for (const field of BASE_TASK_FIELDS) {
    if (!(field in obj)) missing.push(field);
  }
  for (const field of TASK_TYPE_FIELDS[taskType]) {
    if (!(field in obj)) missing.push(field);
  }

  if (missing.length > 0) {
    throw new Error(
      `Task of type "${taskType}" is missing required fields: ${
        missing.join(", ")
      }.`,
    );
  }

  return obj as unknown as Task;
}

export interface Translation {
  DE: string;
  EN: string;
}
