import { AfterViewChecked, AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { ShortAnswerTask, Task, } from '../../../../exam';
import { NgIf, NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { trigger, transition, style, animate } from '@angular/animations';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';


@Component({
  selector: 'app-short-answer-task',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonToggleModule,
    MatIconModule,
    MatInputModule,
    NgStyle,
    NgIf,
    MatTooltipModule,
  ],
  animations: [
    trigger(
      'inOutAnimation',
      [
        transition(
          ':enter',
          [
            style({ height: 0, opacity: 0 }),
            animate('0.2s ease-out',
              style({ height: '*', opacity: 1 }))
          ]
        ),
        transition(
          ':leave',
          [
            style({ height: '*', opacity: 1 }),
            animate('.2s ease-in',
              style({ height: 0, opacity: 0 }))
          ]
        )
      ],

    ),
    trigger(
      'leftRightAnimation',
      [
        transition(
          ':enter',
          [
            style({ height: 0, opacity: 0, transform: 'translateX(-100%)' }),
            animate('0.1s ease-out',
              style({ height: '*', opacity: 1, transform: 'translateX(0%)' }))
          ]
        ),
        transition(
          ':leave',
          [
            style({ height: '*', opacity: 1, transform: 'translateX(0%)' }),
            animate('0.1s ease-in',
              style({ height: 0, opacity: 0, transform: 'translateX(100%)' }))
          ]
        )
      ],

    ),
  ],
  templateUrl: './short-answer-task.component.html',
  styleUrls: ['./short-answer-task.component.scss', '../task.scss']
})
export class ShortAnswerTaskComponent implements OnInit, AfterViewInit, AfterViewChecked, OnChanges {
  @Input() public taskId!: string;
  @Input() public preTask?: Task;
  @Input() public bilingual?: boolean;
  @Output() deleteEvent = new EventEmitter<string>();
  @Output() taskChangeEvent = new EventEmitter<ShortAnswerTask>();
  @ViewChild('questionFieldDE') questionFieldDE!: ElementRef;
  @ViewChild('questionFieldEN') questionFieldEN?: ElementRef;



  isBold: boolean = false;
  isItalic: boolean = false;
  isUnderline: boolean = false;
  isQuestionActive: boolean = false;
  languageChanged: boolean = false;

  public task: ShortAnswerTask = {
    taskId: "",
    type: "shortAnswer",
    question: { DE: "", EN: "" },
    solution: { DE: "", EN: "" },
    points: 2
  };

  ngOnInit(): void {
    if (this.preTask) {
      this.task = this.preTask as ShortAnswerTask;
      return;
    }
    this.task.taskId = this.taskId;
    this.taskChangeEvent.emit(this.task);
  }

  ngAfterViewInit() {
    this.questionFieldDE.nativeElement.innerHTML = this.task.question.DE;

    if (this.questionFieldEN == undefined) { return; }
    this.questionFieldEN.nativeElement.innerHTML = this.task.question.EN;

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

    this.questionFieldDE.nativeElement.innerHTML = this.task.question.DE;

    if (this.questionFieldEN == undefined) { return; }
    this.questionFieldEN.nativeElement.innerHTML = this.task.question.EN;
  }


  public activateFormatButtons() {
    this.isQuestionActive = true;
  }

  public deactivateFormatButtons(event: FocusEvent) {
    this.isQuestionActive = false;
  }

  public updateQuestion(event: Event, language: string) {
    const element = event.target as HTMLElement;
    if (language === "DE") {
      this.task.question.DE = element.innerHTML;
    } else {
      this.task.question.EN = element.innerHTML;
    }

    this.taskChangeEvent.emit(this.task);
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

  public onDelete() {
    this.deleteEvent.emit("delete");
  }

  public updateTask() {
    this.taskChangeEvent.emit(this.task);
  }


}
// Removed the incorrect ViewChild function implementation

