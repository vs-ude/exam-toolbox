export class Exam{
    title: string;
    questions: {question: string; points: number}[];

    constructor(title: string, questions: { question: string; points: number }[]) {
        this.title = title;
        this.questions = questions;
    }
}