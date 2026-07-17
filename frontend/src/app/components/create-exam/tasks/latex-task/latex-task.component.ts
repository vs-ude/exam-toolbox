import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { environment } from '../../../../../environments/environment';
import { LatexTask, Task } from '../../../../types/shared/tasks';
import { COMMON_IMPORTS } from '../../../common-imports';

import { TASK_COMMON_IMPORTS } from '../task-common-imports';
import { BaseTaskComponent } from '../base-task/base-task.component';
import { TaskAnimations } from '../task-animations';
import { PreviewDialogComponent } from './preview-dialog/preview-dialog.component';

@Component({
  selector: 'app-latex-task',
  imports: [...TASK_COMMON_IMPORTS, ...COMMON_IMPORTS],
  templateUrl: './latex-task.component.html',
  styleUrls: ['./latex-task.component.scss', '../task.scss'],
  animations: [
    TaskAnimations.inOutAnimation,
    TaskAnimations.leftRightAnimation,
  ],
})
export class LatexTaskComponent extends BaseTaskComponent implements OnInit {
  @Output()
  taskChangeEvent = new EventEmitter<Task>();

  public readonly publicPath = environment.publicPath;

  public task: LatexTask = {
    type: 'latex',
    question: {
      DE: '',
      EN: '',
    },
    questionLatex: { DE: '', EN: '' },
    points: 0,
    tags: [],
    tagIds: [],
    createdBy: 'placeholder',
    createdAt: new Date(),
    lastUsed: new Date(),
    usedIn: [],
    children: [],
  };

  constructor(private dialog: MatDialog) {
    super();
  }

  ngOnInit(): void {
    if (this.preTask) {
      this.task = this.preTask as LatexTask;
      return;
    }
    this.taskChangeEvent.emit(this.task);
  }

  public onOpenPreview() {
    const dialogRef = this.dialog
      .open(PreviewDialogComponent, {
        width: '30%',
        height: '60%',
      })
      .afterClosed();

    dialogRef.subscribe(result => {
      if (!result) return;
      this.task.questionLatex.DE = result;
      this.taskChangeEvent.emit(this.task);
    });
  }

  public isValidMathString(mathString: string): boolean {
    return (
      mathString.length !== 0 &&
      mathString.startsWith('\\(') &&
      mathString.endsWith('\\)')
    );
  }
}
