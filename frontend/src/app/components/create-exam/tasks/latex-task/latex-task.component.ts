import { Component, EventEmitter, NgModule, OnInit, Output } from '@angular/core';
import { BaseTaskComponent } from '../base-task/base-task.component';
import { LatexTask, Task } from '../../../../exam';
import { NgIf, NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatLabel } from '@angular/material/form-field';
import { TaskAnimations } from '../task-animations';

@Component({
  selector: 'app-latex-task',
  standalone: true,
  imports: [NgIf, NgStyle, MatIconModule, FormsModule, MatLabel],
  templateUrl: './latex-task.component.html',
  styleUrl: './latex-task.component.scss',
  animations: [
    TaskAnimations.inOutAnimation,
    TaskAnimations.leftRightAnimation
  ],
})
export class LatexTaskComponent extends BaseTaskComponent implements OnInit {

  @Output() taskChangeEvent = new EventEmitter<Task>();

  public task: LatexTask = {
    taskId: "",
    type: "latexTask",
    question: {
      DE: "",
      EN: "",
    },
    questionLatex: { DE: "", EN: "" },
    solutionLatex: { DE: "", EN: "" },
    points: 0,
    tags: [],
    createdBy: "placeholder",
    createdAt: new Date(),
    lastUsed: new Date(),
    usedIn: []
  };

  ngOnInit(): void {
    if (this.preTask) {
      this.task = this.preTask as LatexTask;
      return;
    }
    this.task.taskId = this.taskId;
    this.taskChangeEvent.emit(this.task);
  }

  public updateTask() {
    this.taskChangeEvent.emit(this.task);
  }

}

