import { NgStyle } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';

import { environment } from '../../../../environments/environment';
import { Translation } from '../../../types/shared/base';
import { TaskAnimations } from '../../tasks/task-animations';
import { LatexTextareaComponent } from '../../latex-textarea/latex-textarea.component';

@Component({
  selector: 'app-task-group-title',
  imports: [LatexTextareaComponent],
  templateUrl: './task-group-title.component.html',
  styleUrl: './task-group-title.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class TaskGroupTitleComponent {
  @Input()
  public assignmentNumber!: number;
  @Input()
  public bilingual!: boolean;
  @Input()
  public preTitle?: Translation;
  @Output()
  titleChangedEvent = new EventEmitter<Translation>();

  description: Translation = { DE: '', EN: '' };

  ngOnInit(): void {
    if (this.preTitle) {
      this.description = this.preTitle;
      return;
    }
    this.titleChangedEvent.emit(this.description);
  }

  public updateTitle(value: string, language: 'DE' | 'EN') {
    if (language === 'DE') {
      this.description.DE = value;
    } else {
      this.description.EN = value;
    }

    this.titleChangedEvent.emit(this.description);
  }
}
