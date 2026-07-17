import {
  Component,
  EventEmitter,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';

import { environment } from '../../../../../environments/environment';
import { ManualText, Task } from '../../../../types/shared/tasks';
import { COMMON_IMPORTS } from '../../../common-imports';

import { TASK_COMMON_IMPORTS } from '../task-common-imports';
import { TaskAnimations } from '../task-animations';
import { BaseTaskComponent } from '../base-task/base-task.component';

@Component({
  selector: 'app-manual-text',
  imports: [...TASK_COMMON_IMPORTS, ...COMMON_IMPORTS],
  templateUrl: './manual-text.component.html',
  styleUrls: ['./manual-text.component.scss', '../task.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [
    TaskAnimations.inOutAnimation,
    TaskAnimations.leftRightAnimation,
  ],
})
export class ManualTextComponent extends BaseTaskComponent {
  @Output()
  taskChangeEvent = new EventEmitter<Task>();

  public readonly publicPath = environment.publicPath;

  public task: ManualText = {
    type: 'manualText',
    question: { DE: '', EN: '' },
    points: 0,
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
      this.task = this.preTask as ManualText;
      return;
    }
    this.taskChangeEvent.emit(this.task);
  }
}
