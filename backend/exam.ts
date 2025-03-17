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
    ;


export interface BaseTask {
    taskId: string;
    type: string;
    question: Question;
    points: number;
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

export interface Translation {
    DE: string;
    EN: string;
}