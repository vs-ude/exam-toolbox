import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Task } from '../../types/shared/tasks';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-update-task-dialog',
  imports: [MatDialogModule, MatButtonModule, FormsModule],
  templateUrl: './update-task-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './update-task-dialog.component.scss',
})
export class UpdateTaskDialogComponent {
  public checked: boolean[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { assignmentNumber: String; task: Task; newTask: boolean }[],
  ) {
    this.checked = data.map(item => item.newTask);
  }
}
