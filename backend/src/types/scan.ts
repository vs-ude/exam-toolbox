export class ExamQRData {
  courseName: string;
  semester: string;
  date: string;
  language: string; // This is configurable
  pageCount: number;
  points: number;
  code: string;

  constructor(
    courseName: string,
    semester: string,
    date: string,
    language: string,
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

export class ExamPageQRData {
  code: string;
  page: number;

  constructor(code: string, page: number) {
    this.code = code;
    this.page = page;
  }
}
