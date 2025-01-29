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

  constructor(
    private api: ApiService,
  ) { }

  public inDropzone = false;
  private bodyElement: HTMLElement = document.body;

  public examName = "New Exam"
  public tasks: Task[] = [];
  public isNameChange = false

  public semesters = ["SS 23", "WS 23/24", "SS 24", "WS 24/25",];
  public selectedSemester = "";

  public examinerName = "";
  public examDate = "";
  public examDuration = 90;

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
        "taskId": "multipleChoice",
        "type": "multipleChoice",
        "question": {
          "DE": "",
          "EN": ""
        },
        "answerOptions": [
          {
            "DE": "",
            "EN": "",
            "correct": true
          },
        ],
        "points": 1
      });
    }
  }

  private pushPoolTask(taskName: string){
    this.tasks.push({
      "taskId": "multipleChoice00",
      "type": "multipleChoice",
      "question": {
        "DE": "Was ist rot und schlecht für die Zähne?",
        "EN": ""
      },
      "answerOptions": [
        {
          "DE": "Zahnpasta",
          "EN": "",
          "correct": false
        },
        {
          "DE": "Backstein",
          "EN": "",
          "correct": true
        },
        {
          "DE": "Zahnbürste",
          "EN": "",
          "correct": false
        }
      ],
      "points": 2
    });
  }

  dragOverDropzone(event: DragEvent) {
    event.preventDefault();
    this.inDropzone = true;
  }

  deleteTask(index: number) {
    this.tasks.splice(index, 1);
  }

  onSave() {
    this.checkIfValid();
    const exam = this.buildExam();
    console.log(exam);


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
        saveAs(examPDF, `${exam.title}.pdf`)
      },
      error: (err) => {
        console.error('Error downloading PDF: ', err)
      }
    })
  }


  private buildExam() {
    return new Exam(
      "examId",
      this.examName,
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

  onTaskChange(task: Task, index: number) {
    this.tasks[index] = task;
    console.log(index, "emitted: ");
    console.log(this.tasks);
  }

}


