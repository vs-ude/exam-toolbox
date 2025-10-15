import { Component, Input, input } from '@angular/core';
import { Task } from '../../exam';
import { MatIconModule } from '@angular/material/icon';
import { ColorProviderService } from '../../services/color-provider.service';
import { NgFor, NgStyle } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { AddTagDialogComponent } from '../add-tag-dialog/add-tag-dialog.component';
import { Tag } from '../../tag';
import { ApiService } from '../../services/api.service';



@Component({
  selector: 'app-task-pool-card',
  standalone: true,
  imports: [MatIconModule, NgStyle,],
  templateUrl: './task-pool-card.component.html',
  styleUrl: './task-pool-card.component.scss'
})
export class TaskPoolCardComponent {
  @Input() task!: Task;
  public taskColor: string = "";
  public mouseHoveringCard: boolean = false;
  public mouseHoveringTagIndex = -1;

  constructor(
    private colorProvider: ColorProviderService,
    private dialog: MatDialog,
    private api: ApiService,
  ) { }

  ngOnInit() {
    this.taskColor = this.colorProvider.getTaskColor(this.task.type)
    this.task.tags = this.task.tags.map(tag => Tag.fromPlain(tag));
  }


  public onDeleteTag(index: number) {
    this.task.tags.splice(index, 1);
    this.api.updateTaskInPool(this.task.taskId, this.task).subscribe(
      res => { console.log("Tag removed successfully!", res) },
      err => { console.error("Error removing Tag"), err });
    this.mouseHoveringTagIndex = -1
  }


  public onAddTag() {
    const dialogRef = this.dialog.open(AddTagDialogComponent, {
      width: '50%',
      height: '50%',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) {
        return;
      }


      if (!result.exists) {
        // create New Tag and link to Task
        const newTag = new Tag(result.name).setColors(result.color, result.textColor);
        newTag.addTask(this.task.taskId);
        this.task.tags.push(newTag);

        this.api.addTag(newTag).subscribe(
          res => { console.log("Tag added successfully", res); },
          err => { console.error("Error adding tag: ", err); }
        );

        this.api.updateTaskInPool(this.task.taskId, this.task).subscribe(
          res => { console.log("Task updated with new tag: ", res); },
          err => { console.error("Error updating task with new tag: ", err); }
        );
      } else {
        // update existing Tag and associated Task
        if (this.task.tags.find(tag => tag.getName() === result.name)) { return; }
        this.api.getTag(result.name).subscribe(
          res => {
            const tag = Tag.fromPlain(res);
            tag.addTask(this.task.taskId);
            this.task.tags.push(tag);

            this.api.updateTaskInPool(this.task.taskId, this.task).subscribe(
              res => { console.log("task updated successfully", res) },
              err => { console.error("Error updating task", err) }
            );
            this.api.updateTag(tag).subscribe(
              res => { console.log("task updated successfully", res) },
              err => { console.error("Error updating Tag", err) },
            );

          },
          err => { console.error("Error fetching Tag", err) }
        )

      }



    });
  }
}
