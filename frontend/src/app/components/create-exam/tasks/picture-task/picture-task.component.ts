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
import { ApiService } from '../../../../services/api.service';
import { TaskFooterComponent } from "../base-task/task-footer/task-footer.component";

@Component({
  selector: 'app-picture-task',
  standalone: true,
  imports: [NgStyle, NgIf, FormsModule, MatCardModule, MatButtonToggleModule, MatIconModule, MatInputModule, MatTooltipModule, DragAndDropDirective, TaskFooterComponent],
  templateUrl: './picture-task.component.html',
  styleUrls: ['./picture-task.component.scss', '../task.scss'],
  animations: [
    TaskAnimations.inOutAnimation,
    TaskAnimations.leftRightAnimation
  ],
})
export class PictureTaskComponent extends BaseTaskComponent {
  constructor(private api: ApiService) {
    super();
  }

  @Output() taskChangeEvent = new EventEmitter<Task>();

  public task: PictureTask = {
    taskId: "",
    type: "pictureTask",
    question: { DE: "", EN: "" },
    questionPicture: { urlDE: "", urlEN: "" },
    solutionPicture: { urlDE: "", urlEN: "" },
    points: 2,
    tags: [],
    createdBy: "placeholder",
    createdAt: new Date(),
    lastUsed: new Date(),
    usedIn: [],
    children: [],
  };

  public pictureFileUrlQuestionDE: string = "";
  public pictureFileUrlQuestionEN: string = "";
  public pictureFileUrlSolutionDE: string = "";
  public pictureFileUrlSolutionEN: string = "";

  ngOnInit(): void {
    if (this.preTask) {
      this.task = this.preTask as PictureTask;

      if (this.task.questionPicture.urlDE) {
        this.downloadFile(this.task.questionPicture.urlDE, "questionDE");
      }
      if (this.task.questionPicture.urlEN) {
        this.downloadFile(this.task.questionPicture.urlEN, "questionEN");
      }
      if (this.task.solutionPicture.urlDE) {
        this.downloadFile(this.task.solutionPicture.urlDE, "solutionDE");
      }
      if (this.task.solutionPicture.urlEN) {
        this.downloadFile(this.task.solutionPicture.urlEN, "solutionEN");
      }
      return;
    }
    this.task.taskId = this.taskId;
    this.taskChangeEvent.emit(this.task);
  }

  public fileBrowseHandler(event: Event, imageAffiliation: string) {
    let input = event.target as HTMLInputElement;
    const file = input.files![0];
    this.handleNewPicture(file, imageAffiliation)
  }

  public onFileDropped(file: File, imageAffiliation: string) {
    if (!file.type.startsWith("image/")) {
      console.error("The selected file is not an image.");
      return;
    }
    this.handleNewPicture(file, imageAffiliation);
  }

  private handleNewPicture(picture: File, imageAffiliation: string) {
    this.uploadFile(picture, imageAffiliation)
    this.previewPicture(picture, imageAffiliation);
    this.taskChangeEvent.emit(this.task);
  }

  private uploadFile(file: File, imageAffiliation: string) {
    this.api.uploadFile(file).subscribe(
      (response: any) => {
        console.log("File uploaded successfully: ", response.url);
        this.saveBackendURL(response.url, imageAffiliation);
      },
      error => { console.error("Error uploading file: ", error); }
    )
  }

  private saveBackendURL(url: string, imageAffiliation: string) {
    switch (imageAffiliation) {
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

  private downloadFile(url: string, imageAffiliation: string) {
    this.api.downloadFile(url).subscribe(
      response => {
        const newBlob = new Blob([response], { type: response.type });

        let reader = new FileReader();
        reader.readAsDataURL(newBlob);
        reader.onload = () => {
          const url = reader.result as string;
          this.setPictureFrontendUrl(url, imageAffiliation);
        }
      },
      error => { console.error("Error downloading file: ", error); }
    )

  }



  private previewPicture(file: File, imageAffiliation: string) {
    let reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const url = reader.result as string;
      this.setPictureFrontendUrl(url, imageAffiliation);
    }
  }

  private setPictureFrontendUrl(url: string, imageAffiliation: string) {
    switch (imageAffiliation) {
      case "questionDE":
        this.pictureFileUrlQuestionDE = url;
        break;
      case "questionEN":
        this.pictureFileUrlQuestionEN = url;
        break;
      case "solutionDE":
        this.pictureFileUrlSolutionDE = url;
        break;
      case "solutionEN":
        this.pictureFileUrlSolutionEN = url;
        break;
      default:
        break;
    }
  }

  public onRemovePreviewQuestionDE() {
    this.task.questionPicture.urlDE = "";
    this.pictureFileUrlQuestionDE = "";
    this.taskChangeEvent.emit(this.task);
  }

  public onRemovePreviewQuestionEN() {
    this.task.questionPicture.urlEN = "";
    this.pictureFileUrlQuestionEN = "";
    this.taskChangeEvent.emit(this.task);
  }

  public onRemovePreviewSolutionDE() {
    this.task.solutionPicture.urlDE = "";
    this.pictureFileUrlSolutionDE = "";
    this.taskChangeEvent.emit(this.task);
  }

  public onRemovePreviewSolutionEN() {
    this.task.solutionPicture.urlEN = "";
    this.pictureFileUrlSolutionEN = "";
    this.taskChangeEvent.emit(this.task);
  }



}