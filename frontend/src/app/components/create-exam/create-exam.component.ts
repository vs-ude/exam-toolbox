import { Component, ElementRef, HostListener, viewChild, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgFor, NgIf, NgStyle } from '@angular/common';
import { Exam, Task } from '../../exam';
import { AddTaskComponent } from './add-task/add-task.component';
import { TaskComponent } from "./task/task.component";
import {MatSelectModule} from '@angular/material/select';
import { FormsModule, } from '@angular/forms';



@Component({
  selector: 'app-create-exam',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule, AddTaskComponent, TaskComponent, NgFor, NgIf, TaskComponent, MatSelectModule, FormsModule],
  templateUrl: './create-exam.component.html',
  styleUrl: './create-exam.component.scss'
})
export class CreateExamComponent {

  constructor(
  ) { }

  public inDropzone = false;
  private bodyElement: HTMLElement = document.body;

  public examName = "New Exam"
  public tasks: Task[] = [];
  public isNameChange = false

  public semesters = ["SS 23", "WS 23/24", "SS 24", "WS 24/25",];
  public selectedSemester = "";

  public examinerName = "";

  @ViewChild("nameInput") nameInput?: ElementRef;

  @HostListener("document:click", ["$event"])
  unselectInputs(event: MouseEvent) {
    const elementId = (event.target as Element).id;

    if (elementId === "examName") {
      return;
    }
    this.isNameChange = false;
    if (!this.nameInput) { return; }
    const newName = this.nameInput.nativeElement.value;
    if (newName === "") { return }
    this.examName = newName
  }

  onNameChange(event: any) {
    if (event.key !== "Enter") { return }
    const newName = event.target.value;
    if (newName !== "") {
      this.examName = event.target.value;
    };
    this.isNameChange = false;
  }

  dragStart(event: DragEvent) {
    this.bodyElement.classList.add("inheritCursors");
    this.bodyElement.style.cursor = "grabbing";
  }

  drop(event: DragEvent) {
    this.bodyElement.classList.remove("inheritCursors");
    this.bodyElement.style.cursor = "unset"
    const element = event.target as Element;
    if (this.inDropzone) {
      this.tasks.push({
        "taskId": "multipleChoice00",
        "type": "multipleChoice",
        "question": {
            "DE": "Was machen Sachen?",
            "EN": ""
        },
        "answerOptions": [
            {
                "DE": "Hallo",
                "EN": "",
                "correct": true
            },
            {
                "DE": "OK",
                "EN": "",
                "correct": true
            },
            {
                "DE": "cool",
                "EN": "",
                "correct": false
            }
        ],
        "points": 2
    } );
    }
    this.inDropzone = false;
    console.log(this.tasks);
  }

  dragOverDropzone(event: DragEvent) {
    event.preventDefault();
    this.inDropzone = true;
  }

  deleteTask(index: number) {
    this.tasks.splice(index, 1);
  }

  onSave() {
    this.checkIfExamValid();
     const exam = this.buildExam();
     console.log(exam);
    }


  private buildExam(){
    return new Exam(
      "examId", 
      this.examName,
      "courseName",
      this.examinerName,
      this.selectedSemester,
      "examDate",
      90,
      this.tasks
    );
  }

  private checkIfExamValid(){
    if (this.examName === "" || this.examName === "New Exam" ) {
      alert("Please enter a name for the exam");
      throw new Error("no exam name");
    }

    if (this.selectedSemester === ""){
      alert("Please select a semester");
      throw new Error("No semester selected");
    }

    if (this.examinerName === ""){
      alert("Please enter the examiner's name");
      throw new Error("No examiner name");
    }
  }

  onTaskChange(task: Task, index: number) {
    console.log(index, "emitted: ");
    console.log(task);
  }

}


