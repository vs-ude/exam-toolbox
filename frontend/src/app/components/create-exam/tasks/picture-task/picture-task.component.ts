import { BaseTaskComponent } from '../base-task/base-task.component';
import { NgIf, NgStyle } from '@angular/common';
import { Component, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PictureTask, Task } from '../../../../exam';
import { TaskAnimations } from '../task-animations';
import { DragAndDropDirective } from '../drag-and-drop.directive';

@Component({
  selector: 'app-picture-task',
  standalone: true,
  imports: [NgStyle, NgIf, FormsModule, MatCardModule, MatButtonToggleModule, MatIconModule, MatInputModule, MatTooltipModule,DragAndDropDirective],
  templateUrl: './picture-task.component.html',
  styleUrls: ['./picture-task.component.scss','../task.scss'],
  animations: [
    TaskAnimations.inOutAnimation, 
    TaskAnimations.leftRightAnimation
  ],
})
export class PictureTaskComponent extends BaseTaskComponent {

  @Output() taskChangeEvent = new EventEmitter<Task>();

  public url = "";

  public task: PictureTask = {
    taskId: "",
    type: "pictureTask",
    question: { DE: "", EN: "" },
    questionPicture: { urlDE: "", urlEN: "" },
    solutionPicture: { urlDE: "", urlEN: "" },
    points: 2
  };

  ngOnInit(): void {
    if (this.preTask) {
      this.task = this.preTask as PictureTask;
      return;
    }
    this.task.taskId = this.taskId;
    this.taskChangeEvent.emit(this.task);
  }

  public updateTask() {
    this.taskChangeEvent.emit(this.task);
  }

  public fileBrowseHandler(event: Event){
    let input = event.target as HTMLInputElement;
    this.readFile(input.files![0]);
  }

  public onFileDropped(file: File){
    this.readFile(file);
  }

  private readFile(file: File){
    let reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      this.url = reader.result as string;
      console.log(this.url);
    }
  }


}
