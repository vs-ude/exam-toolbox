import { NgFor, NgIf, NgStyle } from '@angular/common';
import { Component, Input, Output, EventEmitter, AfterViewInit, OnInit, viewChild, ViewChild, ElementRef, OnChanges, SimpleChanges, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { trigger, transition, style, animate } from '@angular/animations';
import { MultipleChoiceTask, Task } from '../../../../exam';



@Component({
  selector: 'app-multiplechoiceTask',
  standalone: true,
  imports: [
    FormsModule,
    NgFor,
    MatCardModule,
    MatButtonToggleModule,
    MatIconModule,
    MatInputModule,
    NgStyle,
    NgIf,
    MatTooltipModule,

  ],
  templateUrl: './multiplechoice-task.component.html',
  styleUrl: './multiplechoice-task.component.scss',
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
            style({ height: 0, opacity: 0, transform:'translateX(-100%)' }),
            animate('0.1s ease-out',
              style({ height: '*', opacity: 1,  transform:'translateX(0%)' }))
          ]
        ),
        transition(
          ':leave',
          [
            style({ height: '*', opacity: 1 ,  transform:'translateX(0%)'}),
            animate('0.1s ease-in',
              style({ height: 0, opacity: 0,  transform:'translateX(100%)' }))
          ]
        )
      ],
      
    ),
  ]
})


export class MultiplechoiceTaskComponent implements OnInit, AfterViewInit, AfterViewChecked, OnChanges {
  @Input() public taskId!: string;
  @Input() public preTask?: Task;
  @Input() public bilingual?: boolean;
  @Output() deleteEvent = new EventEmitter<string>();
  @Output() taskChangeEvent = new EventEmitter<MultipleChoiceTask>();
  @ViewChild("questionFieldDE") questionFieldDE!: ElementRef;
  @ViewChild("questionFieldEN") questionFieldEN?: ElementRef;

  isBold: boolean = false;
  isItalic: boolean = false;
  isUnderline: boolean = false;
  isQuestionActive: boolean = false;
  languageChanged:boolean = false;

  pointsPerOption = 1;

  public task: MultipleChoiceTask = {
    taskId: "",
    type: "multipleChoice",
    question: {
      DE: "",
      EN: "",
    },
    answerOptions: [{ DE: "Option1", EN: "", correct: false }],
    points: 0
  };


  ngOnInit(): void {
    if (this.preTask) {
      this.task = this.preTask as MultipleChoiceTask;
      this.pointsPerOption = this.task.points / this.task.answerOptions.filter(option => option.correct).length;
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
    if (!this.languageChanged){return;}
    this.languageChanged = false;

    this.questionFieldDE.nativeElement.innerHTML = this.task.question.DE;

    if (this.questionFieldEN == undefined) { return; }
    this.questionFieldEN.nativeElement.innerHTML = this.task.question.EN;
  }

  updateQuestion(event: Event, language: string) {
    const element = event.target as HTMLElement;
    if (language === "DE") {
      this.task.question.DE = element.innerHTML;
    } else {
      this.task.question.EN = element.innerHTML;
    }

    this.taskChangeEvent.emit(this.task);
  }


  addOption() {
    this.task.answerOptions.push({ DE: "", EN: "", correct: false });
    this.taskChangeEvent.emit(this.task);
  }

  removeOption(index: number) {
    if (this.task.answerOptions.length <= 1) { return; }
    this.task.answerOptions.splice(index, 1);
    this.taskChangeEvent.emit(this.task);
  }

  changeOption(event: any, index: number, language: string) {
    if (language === "DE") {
      this.task.answerOptions[index].DE = event.target.value;
    } else {
      this.task.answerOptions[index].EN = event.target.value;
    }

    this.taskChangeEvent.emit(this.task);
  }

  setQuestionFormat(format: string, event: MouseEvent) {
    event.preventDefault();
    document.execCommand(format);
    this.updateButtonStates();
  }

  updateButtonStates() {
    this.isBold = document.queryCommandState('bold');
    this.isItalic = document.queryCommandState('italic');
    this.isUnderline = document.queryCommandState('underline');
  }


  public activateFormatButtons() {
    this.isQuestionActive = true;
  }


  public deactivateFormatButtons(event: FocusEvent) {
    this.isQuestionActive = false;
  }

  public onDelete() {
    this.deleteEvent.emit("delete");
  }

  public onOptionCorrectChange() {
    this.task.points = this.pointsPerOption * this.task.answerOptions.filter(option => option.correct).length;
    this.taskChangeEvent.emit(this.task);
  }

  public onPointsChange() {
    this.task.points = this.pointsPerOption * this.task.answerOptions.filter(option => option.correct).length;
    this.taskChangeEvent.emit(this.task);
  }
}
