import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Task } from '../../exam';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-update-task-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, FormsModule],
  templateUrl: './update-task-dialog.component.html',
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
