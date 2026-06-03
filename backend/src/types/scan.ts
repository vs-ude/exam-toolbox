import type { Language } from "./exam.ts";

export class ExamScan {
  courseName: string;
  semester: string;
  date: string;
  language: Language;
  pageCount: number;
  points: number;
  code: string;

  constructor(
    courseName: string,
    semester: string,
    date: string,
    language: Language,
    pageCount: number,
    points: number,
    code: string,
  ) {
    this.courseName = courseName;
    this.semester = semester;
    this.date = date;
    this.language = language;
    this.pageCount = pageCount;
    this.points = points;
    this.code = code;
  }
}

export class ExamPageScan {
  code: string;
  page: number;

  constructor(code: string, page: number) {
    this.code = code;
    this.page = page;
  }
}
