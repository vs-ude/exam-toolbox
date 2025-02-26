import { Component, ElementRef, HostListener, viewChild, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgFor, NgIf } from '@angular/common';
import { Exam, Task } from '../../exam';
import { AddTaskComponent } from './add-task/add-task.component';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule, } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { saveAs } from 'file-saver';
import { MatTabsModule } from '@angular/material/tabs';
import { MultiplechoiceTaskComponent } from './tasks/multipleChoiceTask/multiplechoice-task.component';
import { ShortAnswerTaskComponent } from "./tasks/short-answer-task/short-answer-task.component";
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';





@Component({
  selector: 'app-create-exam',
  standalone: true,
  imports: [
    MatIconModule,
    MatTooltipModule,
    AddTaskComponent,
    MultiplechoiceTaskComponent,
    NgFor,
    NgIf,
    MatSelectModule,
    FormsModule,
    MatCardModule,
    MatTabsModule,
    ShortAnswerTaskComponent,
  ],
  templateUrl: './create-exam.component.html',
  styleUrl: './create-exam.component.scss'
})
export class CreateExamComponent {

  public inDropzone = false;
  public isNameChange = false
  public isUpdateMode = false
  private bodyElement: HTMLElement = document.body;
  public taskColor: { [key: string]: string } = { multipleChoice: "var(--color-primary)", shortAnswer: "var(--color-warn)", misc: "var(--color-secondary)" }
  public semesters = ["SS 23", "WS 23/24", "SS 24", "WS 24/25",];

  public taskPool: Task[] = [];
  public totalPoints = 0;
  public bilingual = false;
  public exam = new Exam("", "", "", "", 0, [[]]);

  public currentGroupView = 0;


  constructor(
    private api: ApiService,
    private router: Router,
  ) {
    this.importExam();
    this.importPoolTasks();
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
    this.exam.courseName = newName;
  }

  onNameChange(event: any) {
    if (event.key !== "Enter") { return }
    const newName = event.target.value;
    if (newName !== "") {
      this.exam.courseName = event.target.value;
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
    switch (taskType) {
      case "new_multipleChoice":
        this.exam.tasks[this.currentGroupView].push({
          taskId: "multipleChoice" + Math.floor(Math.random() * (1000 - 0 + 1)) + 0,
          type: "multipleChoice",
          question: { DE: "", EN: "" },
          answerOptions: [{ DE: "", EN: "", correct: true },],
          points: 1
        });
        break;
      case "new_text":
        this.exam.tasks[this.currentGroupView].push({
          taskId: "shortText" + + Math.floor(Math.random() * (1000 - 0 + 1)) + 0,
          type: "shortAnswer",
          question: { DE: "", EN: "" },
          solution: { DE: "", EN: "" },
          points: 1
        });
        break;

      default:
        break;
    }

    this.adjustTotalPoints();
  }

  private pushPoolTask(taskId: string) {
    const task = this.taskPool.find(element => element.taskId === taskId);
    if (task == undefined) {
      console.warn("couldn't find task");
      return;
    }
    this.exam.tasks[this.currentGroupView].push(task);
    this.adjustTotalPoints();
  }

  dragOverDropzone(event: DragEvent) {
    event.preventDefault();
    this.inDropzone = true;
  }

  deleteTask(index: number) {
    this.exam.tasks[this.currentGroupView].splice(index, 1);
    this.adjustTotalPoints();
  }

  onSave() {
    this.checkIfValid();
    console.log(this.exam);

    this.api.addTaskToPool(this.exam.tasks[this.currentGroupView][0]).subscribe(
      response => {
        console.log('Task added successfully: ', response);
      },
      error => {
        console.error('Error adding task: ', error);
      }
    )


    this.api.addExam(this.exam).subscribe(
      response => {
        console.log('Exam added successfully: ', response);
        this.router.navigate([`/create-exam/${response.insertedId}`]) // uses the id inserted by mongodb to navigate to a detailed view of this exam
      },
      error => {
        console.error('Error adding exam: ', error);
      }
    );
  }

  onPreview() {
    this.checkIfValid()
    console.log(this.exam)

    this.api.generateExam(this.exam).subscribe({
      next: (examPDF: Blob) => {
        saveAs(examPDF, `${this.exam.courseName}.pdf`)
      },
      error: (err) => {
        console.error('Error downloading PDF: ', err)
      }
    })
  }


  private checkIfValid() {
    if (this.exam.courseName === "") {
      alert("Please enter a name for the exam");
      throw new Error("no exam name");
    }

    if (this.exam.semester === "") {
      alert("Please select a semester");
      throw new Error("No semester selected");
    }

    if (this.exam.examinerName === "") {
      alert("Please enter the examiner's name");
      throw new Error("No examiner name");
    }

    if (this.exam.date === "") {
      alert("Please enter the exam date");
      throw new Error("no exam date set")
    }
  }

  private adjustTotalPoints() {
    this.totalPoints = this.exam.tasks.flat().reduce((accumulator: number, task) => accumulator += task.points, 0);
  }

  onTaskChange(task: Task, index: number) {
    this.exam.tasks[this.currentGroupView][index] = task;
    this.adjustTotalPoints();
    console.log(index, "emitted: ");
    console.log(this.exam.tasks);
  }

  onUpdate() {
    this.checkIfValid()
    this.api.updateExam(this.exam._id, this.exam).subscribe(
      response => {
        console.log('Exam updated successfully: ', response);
      },
      error => {
        console.error('Error updating exam: ', error);
      }
    )
  }

  private importExam() {
    const lastURLPart = this.router.url.split("/").pop();
    if (lastURLPart === "create-exam" || lastURLPart == undefined) {
      this.isUpdateMode = false
      return;
    }
    this.exam._id = lastURLPart
    this.isUpdateMode = true
    this.api.getExam(lastURLPart).subscribe(
      response => {
        this.exam = response;
        this.adjustTotalPoints();
      },
      error => {
        console.error(error);
      }
    );
  }

  private importPoolTasks() {
    this.api.getTasksFromPool().subscribe(
      response => {
        this.taskPool = response;
      },
      error => {
        console.error(error);
      })
  }

  public mapToChar(index: number) {
    return String.fromCharCode(97 + index%26);
  }

  public addTab() {
    this.exam.tasks.push(new Array<Task>());
    this.currentGroupView = this.exam.tasks.length - 1;
  }

  public deleteTab() {
    if (this.exam.tasks.length === 1) {
      return;
    }
    this.exam.tasks.splice(this.currentGroupView, 1);
    this.currentGroupView--;
  }


  public changeTab(index: number) {
    this.currentGroupView = index;
  }

}


