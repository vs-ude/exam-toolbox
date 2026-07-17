import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

import { Task } from '../../../types/shared/tasks';

@Component({
  selector: 'app-new-page-dialog',
  imports: [MatDialogModule],
  templateUrl: './new-page-dialog.component.html',
  styleUrl: './new-page-dialog.component.scss',
})
export class NewPageDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { taskNumber: string; task: Task },
  ) {
    console.log('Task:');
    console.log(this.data.task);
  }
}
