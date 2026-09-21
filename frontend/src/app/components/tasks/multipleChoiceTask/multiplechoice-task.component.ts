import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { MatDivider } from '@angular/material/divider';
import { MatCheckbox } from '@angular/material/checkbox';

import { environment } from '../../../../environments/environment';
import { MultipleChoiceTask, Task } from '../../../types/shared/tasks';
import { Language } from '../../../types/shared/base';
import { COMMON_IMPORTS } from '../../common-imports';
import { LatexTextareaComponent } from '../../latex-textarea/latex-textarea.component';

import { BaseTaskComponent } from '../base-task/base-task.component';
import { TaskAnimations } from '../task-animations';
import { TASK_COMMON_IMPORTS } from '../task-common-imports';

@Component({
  selector: 'app-multiplechoiceTask',
  imports: [
    ...TASK_COMMON_IMPORTS,
    ...COMMON_IMPORTS,
    LatexTextareaComponent,
    MatDivider,
    MatCheckbox,
  ],
  templateUrl: './multiplechoice-task.component.html',
  styleUrls: ['./multiplechoice-task.component.scss', '../task.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [TaskAnimations.inOutAnimation],
})
export class MultiplechoiceTaskComponent
  extends BaseTaskComponent
  implements OnInit
{
  @Output()
  taskChangeEvent = new EventEmitter<Task>();

  numCorrect = signal<number>(0);
  pointsPerOption = 1;

  public task: MultipleChoiceTask = {
    type: 'multipleChoice',
    question: {
      A: '',
      B: '',
    },
    answerOptions: [{ A: 'Option1', B: '', correct: false }],
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
      this.updateNumCorrect(this.task.answerOptions);
      this.pointsPerOption = this.task.points / this.numCorrect();
      return;
    }
    this.taskChangeEvent.emit(this.task);
  }

  addOption() {
    this.task.answerOptions.push({ A: '', B: '', correct: false });
    this.taskChangeEvent.emit(this.task);
  }

  removeOption(index: number) {
    if (this.task.answerOptions.length <= 1) return;
    this.task.answerOptions.splice(index, 1);
    this.updateNumCorrect(this.task.answerOptions);
    this.taskChangeEvent.emit(this.task);
  }

  changeOption(text: any, index: number, language: Language) {
    if (language === 'A') {
      this.task.answerOptions[index].A = text;
    } else {
      this.task.answerOptions[index].B = text;
    }

    this.taskChangeEvent.emit(this.task);
  }

  public onOptionCorrectChange() {
    this.updateNumCorrect(this.task.answerOptions);
    this.task.points = this.pointsPerOption * this.numCorrect();
    this.taskChangeEvent.emit(this.task);
  }

  public onPointsChange() {
    this.task.points = this.pointsPerOption * this.numCorrect();
    this.taskChangeEvent.emit(this.task);
  }

  updateNumCorrect(options: any[]) {
    this.numCorrect.set(options.filter(option => option.correct).length);
  }
}
