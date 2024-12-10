import { Component, ElementRef, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TaskComponent } from './task/task.component';
import { NgFor, NgStyle } from '@angular/common';




@Component({
  selector: 'app-create-exam',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule, TaskComponent, NgFor],
  templateUrl: './create-exam.component.html',
  styleUrl: './create-exam.component.scss'
})
export class CreateExamComponent {

  public inDropzone = false;
  private bodyElement: HTMLElement = document.body;

  tasks:string[] = [];

  dragStart(event: DragEvent) {
    this.bodyElement.classList.add("inheritCursors");
    this.bodyElement.style.cursor = "grabbing";
  }

  drop(event: DragEvent) {
    this.bodyElement.classList.remove("inheritCursors");
    this.bodyElement.style.cursor = "unset"
    const element = event.target as Element;
    this.tasks.push(element.id);

  }

  dragOverDropzone(event: DragEvent) {
    event.preventDefault();
  }
}


