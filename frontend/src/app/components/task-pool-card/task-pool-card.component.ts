import { Component, Input, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NgFor, NgStyle } from '@angular/common';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { environment } from '../../../environments/environment';

import { Task } from '../../types/shared/tasks';
import { ColorProviderService } from '../../services/color-provider.service';
import { Tag } from '../../types/shared/tag';
import { ApiService } from '../../services/api.service';
import { TagHelperService } from '../../services/tag-helper.service';

import {
  AddTagDialogComponent,
  AddTagDialogData,
} from '../add-tag-dialog/add-tag-dialog.component';

@Component({
  selector: 'app-task-pool-card',
  imports: [MatIconModule, NgStyle],
  templateUrl: './task-pool-card.component.html',
  styleUrl: './task-pool-card.component.scss',
})
export class TaskPoolCardComponent {
  @Input()
  task!: Task;
  public taskColor: string = '';
  public mouseHoveringCard: boolean = false;
  public mouseHoveringTagIndex = -1;
  public publicPath = environment.publicPath;

  constructor(
    private colorProvider: ColorProviderService,
    private dialog: MatDialog,
    private api: ApiService,
    private tagHelper: TagHelperService,
  ) {}

  ngOnInit() {
    this.taskColor = this.colorProvider.getTaskColor(this.task.type);
  }

  public onDeleteTag(index: number) {
    const tagToRemove = this.task.tags.splice(index, 1)[0];
    this.tagHelper.removeTagIdFromTask(tagToRemove, this.task);

    this.mouseHoveringTagIndex = -1;
  }

  public onAddTag() {
    const dialogRef: MatDialogRef<AddTagDialogComponent, AddTagDialogData> =
      this.dialog.open(AddTagDialogComponent, {
        width: '50%',
        height: '50%',
        data: {},
      });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) {
        return;
      }

      const tag = {
        _id: result._id,
        name: result.name,
        color: result.color,
        textColor: result.textColor,
      };

      if (result.exists) {
        this.tagHelper.addTagToTask(tag, this.task);
        return;
      }

      this.tagHelper.createTagAndAddToTask(tag, this.task);
    });
  }
}
