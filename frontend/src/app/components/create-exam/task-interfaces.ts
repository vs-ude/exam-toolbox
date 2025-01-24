
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