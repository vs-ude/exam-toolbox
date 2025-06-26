export class Exam {
    _id?: string = undefined;
    courseName: string;
    examinerName: string;
    semester: string;
    date: string;
    examLengthMinutes: number;
    tasks: TaskGroup[];

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
}

export interface TaskGroup {
    groupNumber: number;
    groupTitle: Translation;
    tasks: Task[];
}


export type Task =
    | MultipleChoiceTask
    | ShortAnswerTask
    | PictureTask
    | LatexTask
    | TableTask
    ;


export interface BaseTask {
    taskId: string;
    type: string;
    question: Question;
    points: number;
    tags: Tag[];
    createdBy: string;
    createdAt: Date;
    lastUsed: Date;
    usedIn: string[];
    parent?: string; 
}

export interface Question {
    DE: string;
    EN: string;
}

export interface MultipleChoiceTask extends BaseTask {
    type: "multipleChoice";
    answerOptions: AnswerOptions[];
}

export interface AnswerOptions {
    DE: string;
    EN: string;
    correct: boolean;
}

export interface ShortAnswerTask extends BaseTask {
    type: "shortAnswer";
    solution: Translation;
}

export interface PictureTask extends BaseTask {
    type: "pictureTask";
    questionPicture: Image;
    solutionPicture: Image;
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
    solutionLatex: Translation;
}

export interface TableTask extends BaseTask {
    type: "table"
    numberOfColumns: number;
    numberOfRows: number;
    tableData: Translation[][];
}

export interface Translation {
    DE: string;
    EN: string;
}

export interface Tag {
    name: string;
    color: string;
    textColor: string;
}