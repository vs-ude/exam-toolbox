import { Component, EventEmitter, Output } from '@angular/core';
import { TaskAnimations } from '../task-animations';
import { BaseTaskComponent } from '../base-task/base-task.component';
import { ManualText, Task } from '../../../../types/shared/tasks';
import { NgIf, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatLabel } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MathJaxParagraphComponent } from '../../../math-jax-paragraph/math-jax-paragraph.component';
import { TaskFooterComponent } from '../base-task/task-footer/task-footer.component';
import { environment } from '../../../../../environments/environment';

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
    TaskFooterComponent,
  ],
  templateUrl: './manual-text.component.html',
  styleUrls: ['./manual-text.component.scss', '../task.scss'],
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
