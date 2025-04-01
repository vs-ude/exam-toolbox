import { NgIf, NgStyle } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { Translation } from '../../../exam';
import { TaskAnimations } from '../tasks/task-animations';

@Component({
  selector: 'app-task-group-title',
  standalone: true,
  imports: [
    NgStyle,
    MatIcon,
    NgIf,
  ],
  templateUrl: './task-group-title.component.html',
  styleUrl: './task-group-title.component.scss',
  animations: [TaskAnimations.inOutAnimation, TaskAnimations.leftRightAnimation],
})
export class TaskGroupTitleComponent implements OnChanges, AfterViewChecked {
  @Input() public assignmentNumber!: number;
  @Input() public bilingual!: boolean;
  @Input() public preTitle?: Translation;
  @Output() titleChangedEvent = new EventEmitter<Translation>();
  @ViewChild('titleFieldDE') titleFieldDE!: ElementRef;
  @ViewChild('titleFieldEN') titleFieldEN?: ElementRef;

  description: Translation = { DE: "", EN: "" };


  languageChanged: boolean = false;
  isQuestionActive: boolean = false;
  isBold: boolean = false;
  isItalic: boolean = false;
  isUnderline: boolean = false;

  ngOnInit(): void {
    if (this.preTitle) {
      this.description = this.preTitle;
      return;
    }
    this.titleChangedEvent.emit(this.description);
  }

  ngOnChanges(changes: SimpleChanges): void {
    for (const propName in changes) {
      if (changes.hasOwnProperty(propName)) {
        switch (propName) {
          case 'bilingual': {
            this.languageChanged = true;
          }
        }
      }
    }

  }

  ngAfterViewChecked(): void {
    if (!this.languageChanged) { return; }
    this.languageChanged = false;

    this.titleFieldDE.nativeElement.innerHTML = this.description.DE;

    if (this.titleFieldEN == undefined) { return; }
    this.titleFieldEN.nativeElement.innerHTML = this.description.EN;
  }

  public activateFormatButtons() {
    this.isQuestionActive = true;
  }

  public deactivateFormatButtons(event: FocusEvent) {
    this.isQuestionActive = false;
  }

  public updateTitle(event: Event, language: string) {
    const element = event.target as HTMLElement;
    if (language === "DE") {
      this.description.DE = element.innerHTML;
    } else {
      this.description.EN = element.innerHTML;
    }

    this.titleChangedEvent.emit(this.description);
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



}
