import { NgFor, NgIf, NgStyle } from '@angular/common';
import { Component, Output, EventEmitter, AfterViewInit, OnInit, OnChanges, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MultipleChoiceTask, Task } from '../../../../exam';
import { BaseTaskComponent } from '../base-task/base-task.component';
import { TaskAnimations } from '../task-animations';



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
  styleUrls: ['./multiplechoice-task.component.scss', '../task.scss'],
  animations: [TaskAnimations.inOutAnimation, TaskAnimations.leftRightAnimation,]
})


export class MultiplechoiceTaskComponent extends BaseTaskComponent implements OnInit, AfterViewInit, AfterViewChecked, OnChanges {

  @Output() taskChangeEvent = new EventEmitter<Task>();


  pointsPerOption = 1;

  public task: MultipleChoiceTask = {
    taskId: "",
    type: "multipleChoice",
    question: {
      DE: "",
      EN: "",
    },
    answerOptions: [{ DE: "Option1", EN: "", correct: false }],
    points: 0,
    tags: [],
    createdBy: "placeholder",
    createdAt: new Date(),
    lastUsed: new Date(),
    usedIn: [],
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

  public onOptionCorrectChange() {
    this.task.points = this.pointsPerOption * this.task.answerOptions.filter(option => option.correct).length;
    this.taskChangeEvent.emit(this.task);
  }

  public onPointsChange() {
    this.task.points = this.pointsPerOption * this.task.answerOptions.filter(option => option.correct).length;
    this.taskChangeEvent.emit(this.task);
  }
}
