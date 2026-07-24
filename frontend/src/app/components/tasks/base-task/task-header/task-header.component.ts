import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgStyle } from '@angular/common';
import { MatIcon } from '@angular/material/icon';

import { environment } from '../../../../../environments/environment';
import { Task } from '../../../../types/shared/tasks';
import { TaskAnimations } from '../../task-animations';

@Component({
  selector: 'app-task-header',
  imports: [NgStyle, MatIcon],
  templateUrl: './task-header.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./task-header.component.scss', '../../task.scss'],
  animations: [
    TaskAnimations.inOutAnimation,
    TaskAnimations.leftRightAnimation,
  ],
})
export class TaskHeaderComponent
  implements AfterViewInit, AfterViewChecked, OnChanges
{
  @Input() public bilingual?: boolean;
  @Input() public task!: Task;
  @Input() public questionDEPlaceholder: string = 'Frage Eingeben...';
  @Input() public questionENPlaceholder: string = 'Enter Question...';
  @Output() questionChange = new EventEmitter<{ DE: string; EN: string }>();

  @ViewChild('questionFieldDE') questionFieldDE!: ElementRef;
  @ViewChild('questionFieldEN') questionFieldEN?: ElementRef;

  public readonly publicPath = environment.publicPath;

  public isBold: boolean = false;
  public isItalic: boolean = false;
  public isUnderline: boolean = false;
  public isQuestionActive: boolean = false;

  private languageChanged: boolean = false;

  ngAfterViewInit() {
    this.questionFieldDE.nativeElement.innerHTML = this.task.question.DE;
    if (this.questionFieldEN) {
      this.questionFieldEN.nativeElement.innerHTML = this.task.question.EN;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['bilingual']) {
      this.languageChanged = true;
    }
  }

  ngAfterViewChecked() {
    if (!this.languageChanged) return;
    this.languageChanged = false;
    this.questionFieldDE.nativeElement.innerHTML = this.task.question.DE;
    if (this.questionFieldEN) {
      this.questionFieldEN.nativeElement.innerHTML = this.task.question.EN;
    }
  }

  public activateFormatButtons() {
    this.isQuestionActive = true;
  }

  public deactivateFormatButtons(_event: FocusEvent) {
    this.isQuestionActive = false;
  }

  public setQuestionFormat(format: string, event: MouseEvent) {
    event.preventDefault();
    document.execCommand(format);
    this.updateButtonStates();
  }

  private updateButtonStates() {
    this.isBold = document.queryCommandState('bold');
    this.isItalic = document.queryCommandState('italic');
    this.isUnderline = document.queryCommandState('underline');
  }

  public updateQuestion(event: Event, language: string) {
    const element = event.target as HTMLElement;
    if (language === 'DE') {
      this.task.question.DE = element.innerHTML;
    } else {
      this.task.question.EN = element.innerHTML;
    }
    this.questionChange.emit(this.task.question);
  }
}
