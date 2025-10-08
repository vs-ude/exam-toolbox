interface TagReference {
    type: "task" | "exam";
    id: string;
}

export class Tag {
    name: string;
    color: string;
    textColor: string;
    private usedIn: Array<TagReference>;



    constructor(name: string) {
        this.name = name;
        this.color = '#81c784';
        this.textColor = "#fff";
        this.usedIn = [];
    }

    public addExam(examId: string) {
        this.usedIn = [...new Set(this.usedIn).add({ type: "exam", id: examId })];
        return this;
    }

    public addTask(taskId: string) {
        this.usedIn = [...new Set(this.usedIn).add({type: "task", id: taskId})];
        return this;
    }

    public setColors(color: string, textColor: string = "#fff") {
        this.color = color;
        this.textColor = textColor;
        return this;
    }

    public delete(id: string) {
        this.usedIn = this.usedIn.filter(ref => ref.id !== id);
    }
}