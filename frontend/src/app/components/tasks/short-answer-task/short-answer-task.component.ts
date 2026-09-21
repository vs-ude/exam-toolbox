import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';

import { environment } from '../../../../environments/environment';
import { Language } from '../../../types/shared/base';
import { ShortAnswerTask, Task } from '../../../types/shared/tasks';
import { COMMON_IMPORTS } from '../../common-imports';
import { LatexTextareaComponent } from '../../latex-textarea/latex-textarea.component';

import { BaseTaskComponent } from '../base-task/base-task.component';
import { TaskAnimations } from '../task-animations';
import { TASK_COMMON_IMPORTS } from '../task-common-imports';

@Component({
  selector: 'app-short-answer-task',
  imports: [...TASK_COMMON_IMPORTS, ...COMMON_IMPORTS, LatexTextareaComponent],
  animations: [TaskAnimations.inOutAnimation],
  templateUrl: './short-answer-task.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./short-answer-task.component.scss', '../task.scss'],
})
export class ShortAnswerTaskComponent
  extends BaseTaskComponent
  implements OnInit
{
  @Output()
  taskChangeEvent = new EventEmitter<Task>();

  public task: ShortAnswerTask = {
    type: 'shortAnswer',
    question: { A: '', B: '' },
    solution: { A: '', B: '' },
    points: 2,
    tags: [],
    tagIds: [],
    createdBy: 'placeholder',
    createdAt: new Date(),
    lastUsed: new Date(),
    usedIn: [],
    children: [],
  };

  ngOnInit(): void {
    if (this.preTask) {
      this.task = this.preTask as ShortAnswerTask;
      return;
    }
    this.taskChangeEvent.emit(this.task);
  }

  public updateSolution(value: string, language: Language) {
    if (language === 'A') {
      this.task.solution.A = value;
    } else {
      this.task.solution.B = value;
    }
    this.taskChangeEvent.emit(this.task);
  }
}
