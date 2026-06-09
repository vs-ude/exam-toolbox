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
    courseName: string,
    examinerName: string,
    semester: string,
    date: string,
    examLengthMinutes: number,
    tasks: TaskGroup[],
    _id?: string,
  ) {
    this.courseName = courseName;
    this.examinerName = examinerName;
    this.semester = semester;
    this.date = date;
    this.examLengthMinutes = examLengthMinutes;
    this.tasks = tasks;
  }

  fillPagesAndPoints(this: Exam) {
    this.fillPages();
    this.fillPoints();
  }

  private fillPages(this: Exam) {
    this.pageCount = 1 + this.tasks.reduce( // first page + number of newPages
      (acc, group) =>
        acc +
        (group.tasks.reduce(
          (acc, task) => acc + (task.type === "newPage" ? 1 : 0),
          0,
        ) ?? 0),
      0,
    );
    this.conceptPages = this.conceptPages ?? 2;
    this.pageCount += this.conceptPages + 3; // + front + info + back
    if (this.pageCount % 2 == 0) {
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
  | ShortAnswerTask
  | PictureTask
  | LatexTask
  | TableTask
  | ManualText
  | NewPage;

export interface BaseTask {
  taskId: string;
  type: string;
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

export type Language = "DE" | "EN";

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

export interface Translation {
  DE: string;
  EN: string;
}
