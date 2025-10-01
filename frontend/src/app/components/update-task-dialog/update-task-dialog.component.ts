import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Task } from '../../exam';

@Component({
  selector: 'app-update-task-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './update-task-dialog.component.html',
  styleUrl: './update-task-dialog.component.scss'
})
export class UpdateTaskDialogComponent {
  
  constructor(@Inject(MAT_DIALOG_DATA) public data: { assignmentNumber: String, task: Task,  }) { }

}
