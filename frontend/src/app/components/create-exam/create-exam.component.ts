import { Component, ElementRef, HostListener, viewChild, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgFor, NgIf, NgStyle } from '@angular/common';
import { DbService } from '../../services/db.service';
import { Exam } from '../../exam';
import { AddTaskComponent } from './add-task/add-task.component';
import { TaskComponent } from "./task/task.component";
import { MultipleChoiceTask, Task } from './task-interfaces';


@Component({
  selector: 'app-create-exam',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule, AddTaskComponent, TaskComponent, NgFor, NgIf, TaskComponent],
  templateUrl: './create-exam.component.html',
  styleUrl: './create-exam.component.scss'
})
export class CreateExamComponent {

  constructor(
    private dbService: DbService,
  ) { }

  public inDropzone = false;
  private bodyElement: HTMLElement = document.body;

  public examName = "New Exam"
  public tasks: Task[] = [];
  public isNameChange = false

  @ViewChild("nameInput") nameInput?: ElementRef;

  @HostListener("document:click", ["$event"])
  unselectInputs(event: MouseEvent) {
    const elementId = (event.target as Element).id

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
                "correct": false
            },
            {
                "DE": "OK",
                "EN": "",
                "correct": false
            },
            {
                "DE": "cool",
                "EN": "",
                "correct": false
            }
        ],
        "points": 0
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
    console.log(this.tasks.splice(index, 1));
  }

  onSave() {
    let questions = [];
    for (let question of this.tasks) {
      questions.push({ question: question, points: 10 })
    }

    // Comment in and fix when these informations like title, courseName, etc. is available here.
    // const exam: Exam = new Exam(
    //   examId,
    //   title,
    //   courseName,
    //   examinerName,
    //   semester,
    //   date,
    //   examLengthMinutes,
    //   tasks
    // );

    // this.dbService.addExam(exam).subscribe({
    //   next: (response) => {
    //     console.log('Exam added successfully:', response);
    //   },
    //   error: (error) => {
    //     console.error('Error adding exam:', error);
    //   }
    // })
  }

  onTaskChange(task: Task, index: number) {
    console.log(index, "emitted: ");
    console.log(task);
  }

}


