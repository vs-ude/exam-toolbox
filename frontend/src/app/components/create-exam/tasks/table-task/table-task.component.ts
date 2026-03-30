import { Component, EventEmitter, Output } from '@angular/core';
import { BaseTaskComponent } from '../base-task/base-task.component';
import { TableTask, Task } from '../../../../exam';
import { NgFor, NgIf, NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatLabel } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { TaskAnimations } from '../task-animations';
import { MatTooltip } from '@angular/material/tooltip';
import { TaskFooterComponent } from "../base-task/task-footer/task-footer.component";

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
    TaskFooterComponent
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

  public hasHeader: boolean = false;

  public task: TableTask = {
    taskId: "",
    type: "table",
    question: { "DE": "", "EN": "" },
    tableHeadersQuestion: [],
    tableDataQuestion: [],
    tableDataSolution: [],
    tableHeadersSolution: [],
    points: 0,
    tagIds: [],
    tags: [],
    createdBy: "placeholder",
    createdAt: new Date(),
    lastUsed: new Date(),
    usedIn: [],
    children: [],
  }

  ngOnInit(): void {
    if (this.preTask) {
      this.task = this.preTask as TableTask;
      console.log(this.task)
      //this.hasHeader = !!this.task.tableHeadersQuestion && this.task.tableHeadersQuestion.length > 0;
      return;
    }
    this.task.taskId = this.taskId;
    this.taskChangeEvent.emit(this.task);

  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  addRow() {
    if (!this.task.tableDataQuestion.length) {
      this.task.tableDataQuestion = [
        [{ DE: '', EN: '' }, { DE: '', EN: '' }],
        [{ DE: '', EN: '' }, { DE: '', EN: '' }]
      ];
      this.task.tableDataSolution = [
        [{ DE: '', EN: '' }, { DE: '', EN: '' }],
        [{ DE: '', EN: '' }, { DE: '', EN: '' }]
      ];
    } else {
      const numberOfColumns = this.task.tableDataQuestion[0].length;
      const newRow = Array(numberOfColumns).fill(0).map(() => ({ DE: '', EN: '' }));
      this.task.tableDataQuestion.push(newRow);
      this.task.tableDataSolution.push(newRow.map(() => ({ DE: '', EN: '' })));
    }
    this.updateTask();
  }

  removeRow(rowIdx: number) {
    if (this.task.tableDataQuestion.length > 1) {
      this.task.tableDataQuestion.splice(rowIdx, 1);
      this.task.tableDataSolution.splice(rowIdx, 1);
      this.updateTask();
      return;
    }
    this.task.tableDataQuestion = [];
    this.task.tableDataSolution = [];
  }


  addColumn() {
    if (!this.task.tableDataQuestion.length) {
      this.task.tableDataQuestion = [
        [{ DE: '', EN: '' }, { DE: '', EN: '' }],
        [{ DE: '', EN: '' }, { DE: '', EN: '' }],
      ];
      this.task.tableDataSolution = [
        [{ DE: '', EN: '' }, { DE: '', EN: '' }],
        [{ DE: '', EN: '' }, { DE: '', EN: '' }]
      ];

    } else {
      for (let row of this.task.tableDataQuestion) {
        row.push({ DE: '', EN: '' });
      }
      for (let row of this.task.tableDataSolution) {
        row.push({ DE: '', EN: '' });
      }
      this.task.tableHeadersQuestion.push({ DE: '', EN: '' });
      this.task.tableHeadersSolution.push({ DE: '', EN: '' });
    }

    this.updateTask();
  }


  removeColumn(colIdx: number) {
    if (this.task.tableDataQuestion[0].length > 1) {
      for (let row of this.task.tableDataQuestion) {
        row.splice(colIdx, 1);
      }
      for (let row of this.task.tableDataSolution) {
        row.splice(colIdx, 1);
      }
      this.updateTask();
      this.task.tableHeadersQuestion.splice(colIdx, 1);
      this.task.tableHeadersSolution.splice(colIdx, 1);
      return;
    }
    this.task.tableDataQuestion = [];
    this.task.tableDataSolution = [];
    this.task.tableHeadersQuestion = [];
    this.task.tableHeadersSolution = [];
  }

  blurOnEnter(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter') {
      (keyboardEvent.target as HTMLInputElement).blur();
      keyboardEvent.preventDefault();
    }
  }

}
