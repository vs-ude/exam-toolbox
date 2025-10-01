import { Component, EventEmitter, Output } from '@angular/core';
import { TaskAnimations } from '../task-animations';
import { BaseTaskComponent } from '../base-task/base-task.component';
import { ManualText, Task } from '../../../../exam';
import { NgIf, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatLabel } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MathJaxParagraphComponent } from '../../../math-jax-paragraph/math-jax-paragraph.component';

@Component({
  selector: 'app-manual-text',
  standalone: true,
  imports: [
    NgIf,
    NgStyle,
    MatIconModule,
    FormsModule,
    MatLabel,
    MathJaxParagraphComponent,
    MatTooltip,
  ],
  templateUrl: './manual-text.component.html',
  styleUrls: [
    './manual-text.component.scss',
    '../task.scss'
  ],
  animations: [
    TaskAnimations.inOutAnimation,
    TaskAnimations.leftRightAnimation
  ],
})
export class ManualTextComponent extends BaseTaskComponent {

  @Output() taskChangeEvent = new EventEmitter<Task>();

  public task: ManualText = {
    taskId: "",
    type: "manualText",
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
      this.task = this.preTask as ManualText;
      return;
    }
    this.task.taskId = this.taskId;
    this.taskChangeEvent.emit(this.task);
  }



}
