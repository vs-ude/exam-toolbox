import { Injectable } from '@angular/core';
import { Tag } from '../tag';
import { Exam, Task } from '../exam';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class TagHelperService {
  constructor(private api: ApiService) {}

  public importTagsToTask(task: Task) {
    task.tags = [];
    for (const tagId of task.tagIds) {
      this.api.getTag(tagId).subscribe(
        res => {
          (task.tags.push(res), console.log('added tag to task'));
        },
        err => console.error('Error fetching Tag', err),
      );
    }
  }

  public removeTagIdFromTask(tag: Tag, task: Task) {
    task.tagIds = task.tagIds.filter(id => id != tag._id);

    this.api.updateTaskInPool(task.taskId, task).subscribe(
      res => {
        console.log('Tag removed successfully!', res);
      },
      err => {
        (console.error('Error removing Tag'), err);
      },
    );
  }

  public addTagToTask(tag: Tag, task: Task) {
    if (task.tagIds.includes(tag._id!)) {
      console.log(`Task already has this Tag: ${tag.name}`);
      return;
    }

    task.tagIds.push(tag._id!);
    task.tags.push(tag);

    this.api.updateTaskInPool(task.taskId, task).subscribe(
      res => console.log('updated Task in pool'),
      err => console.error('Error updating Task', err),
    );
  }

  public createTagAndAddToTask(tag: Tag, task: Task) {
    this.api.addTag(tag).subscribe(
      res => {
        const newTag = { ...tag, _id: res.insertedId };
        this.addTagToTask(newTag, task);
      },
      err => console.error('Error adding Tag', err),
    );
  }

  public calcFontColor(backgroundColor: string): string {
    const color =
      backgroundColor.charAt(0) === '#'
        ? backgroundColor.substring(1, 7)
        : backgroundColor;
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);

    return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? '#000000' : '#FFFFFF';
  }
}
