interface TagReference {
    type: "task" | "exam";
    id: string;
}

export class Tag {
    private name: string;
    private color: string;
    private textColor: string;
    private usedBy: Array<TagReference>;



    constructor(name: string) {
        this.name = name;
        this.color = '#81c784';
        this.textColor = "#fff";
        this.usedBy = [];
    }

    public addExam(examId: string) {
        this.usedBy = [...new Set(this.usedBy).add({ type: "exam", id: examId })];
        return this;
    }

    public addTask(taskId: string) {
        this.usedBy = [...new Set(this.usedBy).add({type: "task", id: taskId})];
        return this;
    }

    public setColors(color: string, textColor: string = "#fff") {
        this.color = color;
        this.textColor = textColor;
        return this;
    }

    public delete(id: string) {
        this.usedBy = this.usedBy.filter(ref => ref.id !== id);
    }

    public getUsedBy() {
        return this.usedBy;
    }

    public getName() {
        return this.name;
    }

    public getColor() {
        return this.color;
    }

    public getTextColor() {
        return this.textColor;
    }
}