import { Component, ElementRef, HostListener, viewChild, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgFor, NgIf } from '@angular/common';
import { Exam, Task } from '../../exam';
import { AddTaskComponent } from './add-task/add-task.component';
import { TaskComponent } from "./task/task.component";
import { MatSelectModule } from '@angular/material/select';
import { FormsModule, } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { saveAs } from 'file-saver';



@Component({
  selector: 'app-create-exam',
  standalone: true,
  imports: [
    MatIconModule,
    MatTooltipModule,
    AddTaskComponent,
    TaskComponent,
    NgFor,
    NgIf,
    TaskComponent,
    MatSelectModule,
    FormsModule,
  ],
  templateUrl: './create-exam.component.html',
  styleUrl: './create-exam.component.scss'
})
export class CreateExamComponent {

  public inDropzone = false;
  public isNameChange = false
  private bodyElement: HTMLElement = document.body;
  public taskColor: {[key:string]: string} = {multipleChoice:"var(--color-primary)", shortQuestion: "var(--color-warn)", misc: "var(--color-secondary)"}

  public taskPool: Task[] = [];
  public totalPoints = 0;

  public examName = "New Exam"
  public tasks: Task[] = [];
  public semesters = ["SS 23", "WS 23/24", "SS 24", "WS 24/25",];
  public selectedSemester = "";
  public examinerName = "";
  public examDate = "";
  public examDuration = 90;

  constructor(
    private api: ApiService,
  ) {
    this.api.getTasksFromPool().subscribe(
      response => {
        this.taskPool = response;
        console.log(response)

      },
      error => {
        console.error(error);
      })
  }



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
    console.log(element.id);

    if (this.inDropzone) {
      if (element.id.slice(0, 4) === "new_") {
        this.pushNewTask(element.id);
      } else {
        this.pushPoolTask(element.id);
      }
    }
    this.inDropzone = false;
  }

  private pushNewTask(taskType: string) {
    if (taskType === "new_multipleChoice") {
      this.tasks.push({
        taskId: "multipleChoice",
        type: "multipleChoice",
        question: { DE: "", EN: "" },
        answerOptions: [{ DE: "", EN: "", correct: true },],
        points: 1
      });
    }
    this.adjustTotalPoints();
  }

  private pushPoolTask(taskId: string) {
    const task = this.taskPool.find(element => element.taskId === taskId);
    if (task == undefined){
      console.warn("couldn't find task");
      return;}
    this.tasks.push(task);
    this.adjustTotalPoints();
  }

  dragOverDropzone(event: DragEvent) {
    event.preventDefault();
    this.inDropzone = true;
  }

  deleteTask(index: number) {
    this.tasks.splice(index, 1);
    this.adjustTotalPoints();
  }

  onSave() {
    this.checkIfValid();
    const exam = this.buildExam();
    console.log(exam);

    this.api.addTaskToPool(this.tasks[0]).subscribe(
      response => {
        console.log('Task added successfully: ', response);
      },
      error => {
        console.error('Error adding task: ', error);
      }
    )


    this.api.addExam(exam).subscribe(
      response => {
        console.log('Exam added successfully: ', response);
      },
      error => {
        console.error('Error adding exam: ', error);
      }
    );
  }

  onPreview() {
    this.checkIfValid()
    const exam = this.buildExam()
    console.log(exam)

    this.api.generateExam(exam).subscribe({
      next: (examPDF: Blob) => {
        saveAs(examPDF, `${exam.courseName}.pdf`)
      },
      error: (err) => {
        console.error('Error downloading PDF: ', err)
      }
    })
  }


  private buildExam() {
    return new Exam(
      this.examName,      //course Name here
      this.examinerName,
      this.selectedSemester,
      this.examDate,
      this.examDuration,
      this.tasks
    );
  }

  private checkIfValid() {
    if (this.examName === "") {
      -
        alert("Please enter a name for the exam");
      throw new Error("no exam name");
    }

    if (this.selectedSemester === "") {
      alert("Please select a semester");
      throw new Error("No semester selected");
    }

    if (this.examinerName === "") {
      alert("Please enter the examiner's name");
      throw new Error("No examiner name");
    }

    if (this.examDate === "") {
      alert("Please enter the exam date");
      throw new Error("no exam date set")
    }
  }

  private adjustTotalPoints(){
    console.log("adjust")
    this.totalPoints = this.tasks.reduce((accumulator:number, task) => accumulator += task.points, 0)
  }

  onTaskChange(task: Task, index: number) {
    this.tasks[index] = task;
    this.adjustTotalPoints();
    console.log(index, "emitted: ");
    console.log(this.tasks);
  }

}


