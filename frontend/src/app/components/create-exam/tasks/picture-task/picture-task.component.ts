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
  imports: [NgStyle, NgIf, FormsModule, MatCardModule, MatButtonToggleModule, MatIconModule, MatInputModule, MatTooltipModule, DragAndDropDirective],
  templateUrl: './picture-task.component.html',
  styleUrls: ['./picture-task.component.scss', '../task.scss'],
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

  public fileBrowseHandler(event: Event, tag: string) {
    let input = event.target as HTMLInputElement;
    const file = input.files![0];
    this.readFile(file, tag);
  }

  public onFileDropped(file: File, tag: string) {
    if (!file.type.startsWith("image/")) {
      console.error("The selected file is not an image.");
      return;
    }
    this.readFile(file, tag);
  }

  private readFile(file: File, tag: string) {
    let reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      this.url = reader.result as string;
      this.saveFile(this.url, tag);
    }
  }

  private saveFile(url: string, tag: string) {
    switch (tag) {
      case "questionDE":
        this.task.questionPicture.urlDE = url;
        break;
      case "questionEN":
        this.task.questionPicture.urlEN = url;
        break;
      case "solutionDE":
        this.task.solutionPicture.urlDE = url;
        break;
      case "solutionEN":
        this.task.solutionPicture.urlEN = url;
        break;
      default:
        break;
    }
  }

  public onRemovePreviewQuestionDE() {
    this.task.questionPicture.urlDE = "";
  }

  public onRemovePreviewQuestionEN() {
    this.task.questionPicture.urlEN = "";
  }

  public onRemovePreviewSolutionDE() {
    this.task.solutionPicture.urlDE = "";
  }

  public onRemovePreviewSolutionEN() {
    this.task.solutionPicture.urlEN = "";
  }



}