import { Component, EventEmitter, Output } from '@angular/core';
import { BaseTaskComponent } from '../base-task/base-task.component';
import { TableTask, Task } from '../../../../exam';
import { NgFor, NgIf, NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatLabel } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { TaskAnimations } from '../task-animations';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-table-task',
  standalone: true,
  imports: [
    NgIf,
    NgStyle,
    MatIconModule,
    MatLabel,
    FormsModule,
    NgFor,
    MatTooltip,
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

  public hasHeader: boolean = true;

  public task: TableTask = {
    taskId: "",
    type: "table",
    question: { "DE": "", "EN": "" },
    tableHeaders: [],
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
      console.log(this.task)
      this.hasHeader = !!this.task.tableHeaders && this.task.tableHeaders.length > 0;
      return;
    }
    this.task.taskId = this.taskId;
    this.taskChangeEvent.emit(this.task);

  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  addRow() {
    if (!this.task.tableData.length) {
      // If table is empty, add a header row and one data row with 2 columns by default
      this.task.tableData = [
        [{ DE: '', EN: '' }, { DE: '', EN: '' }],
        [{ DE: '', EN: '' }, { DE: '', EN: '' }]
      ];
    } else {
      const numberOfColumns = this.task.tableData[0].length;
      const newRow = Array(numberOfColumns).fill(0).map(() => ({ DE: '', EN: '' }));
      this.task.tableData.push(newRow);
    }
    this.updateTask();
  }

  removeRow(rowIdx: number) {
    if (this.task.tableData.length > 1) {
      this.task.tableData.splice(rowIdx, 1);
      this.updateTask();
      return;
    }
    this.task.tableData = [];
  }


  addColumn() {
    if (!this.task.tableData.length) {
      // If table is empty, add a header row and one data row with 1 column
      this.task.tableData = [
        [{ DE: '', EN: '' }],
        [{ DE: '', EN: '' }]
      ];
    } else {
      for (let row of this.task.tableData) {
        row.push({ DE: '', EN: '' });
      }
    }
    this.updateTask();
  }


  removeColumn(colIdx: number) {
    if (this.task.tableData[0].length > 1) {
      for (let row of this.task.tableData) {
        row.splice(colIdx, 1);
      }
      this.updateTask();
      return;
    }
    this.task.tableData = [];
  }

  blurOnEnter(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter') {
      (keyboardEvent.target as HTMLInputElement).blur();
      keyboardEvent.preventDefault();
    }
  }

}
