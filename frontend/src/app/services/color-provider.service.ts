import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ColorProviderService {

  private taskColors: { [key: string]: string } = {
    multipleChoice: "var(--color-primary)",
    shortAnswer: "var(--color-secondary)",
    pictureTask: "var(--color-dark-gray)",
    misc: "var(--color-warn)",
  }

  constructor() { }

  public getTaskColor(taskType: string): string {
    return this.taskColors[taskType] || "var(--color-primary)"
  }
}
