import {
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MatDivider } from '@angular/material/divider';
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
  @Input() public questionDEPlaceholder: string = 'Frage (DE)';
  @Input() public questionENPlaceholder: string = 'Question (EN)';
  @Output() questionChange = new EventEmitter<{ DE: string; EN: string }>();

  public updateQuestion(value: string, language: 'DE' | 'EN') {
    if (language === 'DE') {
      this.task.question.DE = value;
    } else {
      this.task.question.EN = value;
    }
    this.questionChange.emit(this.task.question);
  }
}
