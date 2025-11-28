import { Injectable } from '@angular/core';
import { Tag } from '../tag';
import { Exam, Task } from '../exam';
import { ApiService } from './api.service';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TagHelperService {

  constructor(
    private api: ApiService,
  ) { }

  public addTags(exam: Exam, tasksWithModifiedTags: { taskId: string, tagData: { name: string, color: string, textColor: string }}[]) {
    let tasks = this.getAllTasks(exam);
    for (let element of tasksWithModifiedTags) {

      const task = tasks.find(t => t.taskId === element.taskId)
      if (!task) { continue; }

      this.api.getTag(element.tagData.name).subscribe(
        tag => {
          tag = Tag.fromPlain(tag);
          tag.addTask(task.taskId);

          this.updateTag(tag)
        },
        err => { console.error("Error fetching Tag", err) }
      )
    }

  }

  private updateTag(tag: Tag) {
    this.api.updateTag(tag).subscribe(
      res => { },
      err => { console.error("error updating Tag", err) }
    )
  }

  private updateTaskInPool(task: Task) {
    this.api.updateTaskInPool(task.taskId, task).subscribe(
      res => { },
      err => { console.error("Error updating Task in Pool", err) }
    )
  }

  private getAllTasks(exam: Exam) {
    const tasks: Task[] = []
    for (let group of exam.tasks) {
      for (let task of group.tasks)
        tasks.push(task);
    }
    return tasks;
  }

}
