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
import { BaseTaskComponent } from '../base-task/base-task.component';


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
export class ShortAnswerTaskComponent extends BaseTaskComponent implements OnInit, AfterViewInit, AfterViewChecked, OnChanges {

  @Output() taskChangeEvent = new EventEmitter<Task>();


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


  public updateTask() {
    this.taskChangeEvent.emit(this.task);
  }


}

