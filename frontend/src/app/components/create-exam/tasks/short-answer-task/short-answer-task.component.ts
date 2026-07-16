import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  EventEmitter,
  OnChanges,
  OnInit,
  Output,
} from '@angular/core';

import { environment } from '../../../../../environments/environment';
import { ShortAnswerTask, Task } from '../../../../types/shared/tasks';
import { COMMON_IMPORTS } from '../../../common-imports';

import { BaseTaskComponent } from '../base-task/base-task.component';
import { TaskAnimations } from '../task-animations';
import { TASK_COMMON_IMPORTS } from '../task-common-imports';

@Component({
  selector: 'app-short-answer-task',
  standalone: true,
  imports: [...TASK_COMMON_IMPORTS, ...COMMON_IMPORTS],
  animations: [
    TaskAnimations.inOutAnimation,
    TaskAnimations.leftRightAnimation,
  ],
  templateUrl: './short-answer-task.component.html',
  styleUrls: ['./short-answer-task.component.scss', '../task.scss'],
})
export class ShortAnswerTaskComponent
  extends BaseTaskComponent
  implements OnInit, AfterViewInit, AfterViewChecked, OnChanges
{
  @Output()
  taskChangeEvent = new EventEmitter<Task>();

  public readonly publicPath = environment.publicPath;

  public task: ShortAnswerTask = {
    type: 'shortAnswer',
    question: { DE: '', EN: '' },
    solution: { DE: '', EN: '' },
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
}
