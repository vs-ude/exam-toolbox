import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

import { Task } from '../../types/shared/tasks';

@Component({
  selector: 'app-update-task-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatButtonToggleModule,
    FormsModule,
    MatCardModule,
  ],
  templateUrl: './update-task-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './update-task-dialog.component.scss',
})
export class UpdateTaskDialogComponent {
  public toggleValues: string[] = [];

  public get checked(): boolean[] {
    return this.toggleValues.map(v => v === 'new');
  }

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { assignmentNumber: String; task: Task; newTask: boolean }[],
  ) {
    this.toggleValues = data.map(item => (item.newTask ? 'new' : 'update'));
  }
}
