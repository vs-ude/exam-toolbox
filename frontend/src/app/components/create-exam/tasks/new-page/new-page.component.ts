import { Component, EventEmitter, Output } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

import { NewPage, Task } from '../../../../types/shared/tasks';

import { BaseTaskComponent } from '../base-task/base-task.component';
import { TaskAnimations } from '../task-animations';

@Component({
  selector: 'app-new-page',
  standalone: true,
  imports: [MatIcon],
  templateUrl: './new-page.component.html',
  styleUrls: ['./new-page.component.scss', '../task.scss'],
  animations: [
    TaskAnimations.inOutAnimation,
    TaskAnimations.leftRightAnimation,
  ],
})
export class NewPageComponent extends BaseTaskComponent {
  @Output() taskChangeEvent = new EventEmitter<Task>();

  public task: NewPage = {
    type: 'newPage',
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

  override ngAfterViewInit(): void {
    return;
  }

  // element has no language-specific content
  override ngAfterViewChecked(): void {
    return;
  }

  ngOnInit(): void {
    if (this.preTask) {
      this.task = this.preTask as NewPage;
      return;
    }
    this.taskChangeEvent.emit(this.task);
  }
}
