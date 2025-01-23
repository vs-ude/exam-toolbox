export class Exam {
    examId: string;
    title: string;
    courseName: string;
    examinerName: string;
    semester: string;
    date: string;
    examLengthMinutes: number;
    tasks: {
        taskId: string;
        type: string;
        question: { DE: string; EN: string };
        options?: { DE: string; EN: string; correct: boolean }[] | { DE1: string; EN1: string; correct1: boolean; DE2: string; EN2: string; correct2: boolean }[];
        properties?: { DE: string; EN: string; props: string[] };
        solution?: { DE: string; EN: string } | boolean;
        solutions?: { DE: string; EN: string }[];
        caption?: { DE: string; EN: string };
        imagePath?: string;
        solutionImagePath?: string;
        points: number;
    }[];

    constructor(
        examId: string,
        title: string,
        courseName: string,
        examinerName: string,
        semester: string,
        date: string,
        examLengthMinutes: number,
        tasks: {
            taskId: string;
            type: string;
            question: { DE: string; EN: string };
            options?: { DE: string; EN: string; correct: boolean }[] | { DE1: string; EN1: string; correct1: boolean; DE2: string; EN2: string; correct2: boolean }[];
            properties?: { DE: string; EN: string; props: string[] };
            solution?: { DE: string; EN: string } | boolean;
            solutions?: { DE: string; EN: string }[];
            caption?: { DE: string; EN: string };
            imagePath?: string;
            solutionImagePath?: string;
            points: number;
        }[]
    ) {
        this.examId = examId;
        this.title = title;
        this.courseName = courseName;
        this.examinerName = examinerName;
        this.semester = semester;
        this.date = date;
        this.examLengthMinutes = examLengthMinutes;
        this.tasks = tasks;
    }
}