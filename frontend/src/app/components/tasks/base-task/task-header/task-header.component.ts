import {
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MatDivider } from '@angular/material/divider';
import { Language } from '../../../../types/shared/base';
import { Task } from '../../../../types/shared/tasks';
import { COMMON_IMPORTS } from '../../../common-imports';
import { LatexTextareaComponent } from '../../../latex-textarea/latex-textarea.component';

@Component({
  selector: 'app-task-header',
  imports: [...COMMON_IMPORTS, MatDivider, LatexTextareaComponent],
  templateUrl: './task-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./task-header.component.scss', '../../task.scss'],
})
export class TaskHeaderComponent {
  @Input() public bilingual?: boolean;
  @Input() public task!: Task;
  @Input() public questionPlaceholder: string = 'Question';
  @Input() public questionAPlaceholder: string = 'Frage (DE)';
  @Input() public questionBPlaceholder: string = 'Question (EN)';
  @Output() questionChange = new EventEmitter<{ A: string; B: string }>();

  public updateQuestion(value: string, language: Language) {
    if (language === 'A') {
      this.task.question.A = value;
    } else {
      this.task.question.B = value;
    }
    this.questionChange.emit(this.task.question);
  }
}
