import { AfterViewChecked, AfterViewInit, Component, EventEmitter, OnChanges, OnInit, Output } from '@angular/core';
import { ShortAnswerTask, Task, } from '../../../../exam';
import { NgIf, NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseTaskComponent } from '../base-task/base-task.component';
import { TaskAnimations } from '../task-animations';


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
    TaskAnimations.inOutAnimation, 
    TaskAnimations.leftRightAnimation
  ],
  templateUrl: './short-answer-task.component.html',
  styleUrls: [
    './short-answer-task.component.scss', 
    '../task.scss'
  ]
})
export class ShortAnswerTaskComponent extends BaseTaskComponent implements OnInit, AfterViewInit, AfterViewChecked, OnChanges {

  @Output() taskChangeEvent = new EventEmitter<Task>();


  public task: ShortAnswerTask = {
    taskId: "",
    type: "shortAnswer",
    question: { DE: "", EN: "" },
    solution: { DE: "", EN: "" },
    points: 2,
    tags: [],
    createdBy: "placeholder",
    createdAt: new Date(),
    lastUsed: new Date(),
    usedIn: [],
  };

  ngOnInit(): void {
    if (this.preTask) {
      this.task = this.preTask as ShortAnswerTask;
      return;
    }
    this.task.taskId = this.taskId;
    this.taskChangeEvent.emit(this.task);
  }

}

