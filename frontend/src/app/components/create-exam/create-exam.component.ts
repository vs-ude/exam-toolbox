import { Component, ElementRef, HostListener, viewChild, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TaskComponent } from './task/task.component';
import { NgFor, NgIf, NgStyle } from '@angular/common';
import { DbService } from '../../services/db.service';
import { Exam } from '../../exam';


@Component({
  selector: 'app-create-exam',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule, TaskComponent, NgFor, NgIf,],
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
  tasks: string[] = [];
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
      this.tasks.push(element.id);
    }
    this.inDropzone = false;
  }

  dragOverDropzone(event: DragEvent) {
    event.preventDefault();
    this.inDropzone = true;
  }

  onSave() {
    let questions = [];
    for (let question of this.tasks) {
      questions.push({ question: question, points: 10 })
    }

    const exam: Exam = new Exam(this.examName, questions);

    this.dbService.addExam(exam).subscribe({
      next: (response) => {
        console.log('Exam added successfully:', response);
      },
      error: (error) => {
        console.error('Error adding exam:', error);
      }
    })
  }

}


