import { Component, EventEmitter, NgModule, Output } from '@angular/core';
import { BaseTaskComponent } from '../base-task/base-task.component';
import { TableTask, Task } from '../../../../exam';
import { NgIf, NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatLabel } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { TaskAnimations } from '../task-animations';

@Component({
  selector: 'app-table-task',
  standalone: true,
  imports: [
    NgIf,
    NgStyle,
    MatIconModule,
    MatLabel,
    FormsModule,
  ],
  templateUrl: './table-task.component.html',
  styleUrls: [
    './table-task.component.scss',
    '../task.scss'
  ],
  animations: [
    TaskAnimations.inOutAnimation,
    TaskAnimations.leftRightAnimation
  ],
})
export class TableTaskComponent extends BaseTaskComponent {

  @Output() taskChangeEvent = new EventEmitter<Task>();

  public task: TableTask = {
    taskId: "",
    type: "table",
    question: { "DE": "", "EN": "" },
    numberOfColumns: 0,
    numberOfRows: 0,
    tableData: [],
    points: 0,
    tags: [],
    createdBy: "placeholder",
    createdAt: new Date(),
    lastUsed: new Date(),
    usedIn: [],
  }

  ngOnInit(): void {
    if (this.preTask) {
      this.task = this.preTask as TableTask;
      return;
    }
    this.task.taskId = this.taskId;
    this.taskChangeEvent.emit(this.task);
  }

}
