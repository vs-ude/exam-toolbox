import { Component, EventEmitter, Output } from '@angular/core';
import { BaseTaskComponent } from '../base-task/base-task.component';
import { NewPage, Task } from '../../../../exam';
import { TaskAnimations } from '../task-animations';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-new-page',
  standalone: true,
  imports: [
    MatIcon
  ],
  templateUrl: './new-page.component.html',
  styleUrls: [
    './new-page.component.scss',
    '../task.scss'
  ],
  animations: [
    TaskAnimations.inOutAnimation,
    TaskAnimations.leftRightAnimation
  ],
})
export class NewPageComponent extends BaseTaskComponent {

  @Output() taskChangeEvent = new EventEmitter<Task>();

  public task: NewPage = {
    taskId: "",
    type: "newPage",
    question: { DE: "", EN: "" },
    points: 0,
    tags: [],
    createdBy: "placeholder",
    createdAt: new Date(),
    lastUsed: new Date(),
    usedIn: [],
    children: [],
  }

  ngOnInit(): void {
    if (this.preTask) {
      this.task = this.preTask as NewPage;
      return;
    }
    this.task.taskId = this.taskId;
    this.taskChangeEvent.emit(this.task);
  }

}
