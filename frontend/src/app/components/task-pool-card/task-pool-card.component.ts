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
  public mouseHovering: boolean = false;

  constructor(
    private colorProvider: ColorProviderService,
    private dialog: MatDialog,
    private api: ApiService,
  ){}
  
  ngOnInit() {
    this.taskColor = this.colorProvider.getTaskColor(this.task.type)
    this.task.tags = this.task.tags.map(tag => Tag.fromPlain(tag));
  }

  public onAddTag() {
    console.log("Add tag to task at index: ", this.task.taskId);

    const dialogRef = this.dialog.open(AddTagDialogComponent, {
              width: '50%',
              height: '50%',
              data: {}
            });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const newTag = new Tag(result.name).setColors(result.color, result.textColor);

        // link tag and task
        newTag.addTask(this.task.taskId);
        this.task.tags.push(newTag);

        console.log("Created new tag: ", newTag);

        this.api.addTag(newTag).subscribe(
          res => {console.log("Tag added successfully", res);},
          err => {console.error("Error adding tag: ", err);}
        )

        this.api.updateTaskInPool(this.task.taskId, this.task).subscribe(
          res => {
            console.log("Task updated with new tag: ", res);
          },
          err => {
            console.error("Error updating task with new tag: ", err);
          }
        );
        
        // TODO: 
        // update tag and Task in db  
        // add Feature to delete tags from tasks
        // add Feature to add already existing tags to tasks
      }
    });
  }
}
