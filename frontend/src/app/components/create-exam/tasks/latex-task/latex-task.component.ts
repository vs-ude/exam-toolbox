import {
  Component,
  EventEmitter,
  NgModule,
  OnInit,
  Output,
} from '@angular/core';
import { BaseTaskComponent } from '../base-task/base-task.component';
import { LatexTask, Task } from '../../../../types/shared/tasks';
import { NgIf, NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatLabel } from '@angular/material/form-field';
import { TaskAnimations } from '../task-animations';
import { MathJaxParagraphComponent } from '../../../math-jax-paragraph/math-jax-paragraph.component';
import { MatTooltip } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { PreviewDialogComponent } from './preview-dialog/preview-dialog.component';
import { TaskFooterComponent } from '../base-task/task-footer/task-footer.component';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-latex-task',
  standalone: true,
  imports: [
    NgIf,
    NgStyle,
    MatIconModule,
    FormsModule,
    MatLabel,
    MathJaxParagraphComponent,
    MatTooltip,
    TaskFooterComponent,
  ],
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
    taskId: '',
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
    this.task.taskId = this.taskId;
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
