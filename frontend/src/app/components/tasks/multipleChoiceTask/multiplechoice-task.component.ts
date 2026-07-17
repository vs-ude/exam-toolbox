import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  EventEmitter,
  OnChanges,
  OnInit,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';

import { environment } from '../../../../environments/environment';
import { MultipleChoiceTask, Task } from '../../../types/shared/tasks';
import { COMMON_IMPORTS } from '../../common-imports';

import { BaseTaskComponent } from '../base-task/base-task.component';
import { TaskAnimations } from '../task-animations';
import { TASK_COMMON_IMPORTS } from '../task-common-imports';

@Component({
  selector: 'app-multiplechoiceTask',
  imports: [...TASK_COMMON_IMPORTS, ...COMMON_IMPORTS],
  templateUrl: './multiplechoice-task.component.html',
  styleUrls: ['./multiplechoice-task.component.scss', '../task.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [
    TaskAnimations.inOutAnimation,
    TaskAnimations.leftRightAnimation,
  ],
})
export class MultiplechoiceTaskComponent
  extends BaseTaskComponent
  implements OnInit, AfterViewInit, AfterViewChecked, OnChanges
{
  @Output()
  taskChangeEvent = new EventEmitter<Task>();

  public readonly publicPath = environment.publicPath;

  pointsPerOption = 1;

  public task: MultipleChoiceTask = {
    type: 'multipleChoice',
    question: {
      DE: '',
      EN: '',
    },
    answerOptions: [{ DE: 'Option1', EN: '', correct: false }],
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
      this.task = this.preTask as MultipleChoiceTask;
      this.pointsPerOption =
        this.task.points /
        this.task.answerOptions.filter(option => option.correct).length;
      return;
    }
    this.taskChangeEvent.emit(this.task);
  }

  addOption() {
    this.task.answerOptions.push({ DE: '', EN: '', correct: false });
    this.taskChangeEvent.emit(this.task);
  }

  removeOption(index: number) {
    if (this.task.answerOptions.length <= 1) return;
    this.task.answerOptions.splice(index, 1);
    this.taskChangeEvent.emit(this.task);
  }

  changeOption(event: any, index: number, language: string) {
    if (language === 'DE') {
      this.task.answerOptions[index].DE = event.target.value;
    } else {
      this.task.answerOptions[index].EN = event.target.value;
    }

    this.taskChangeEvent.emit(this.task);
  }

  public onOptionCorrectChange() {
    this.task.points =
      this.pointsPerOption *
      this.task.answerOptions.filter(option => option.correct).length;
    this.taskChangeEvent.emit(this.task);
  }

  public onPointsChange() {
    this.task.points =
      this.pointsPerOption *
      this.task.answerOptions.filter(option => option.correct).length;
    this.taskChangeEvent.emit(this.task);
  }
}
