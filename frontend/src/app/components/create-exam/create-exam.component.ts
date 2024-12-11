import { Component, ElementRef, HostListener, viewChild, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TaskComponent } from './task/task.component';
import { NgFor, NgIf, NgStyle } from '@angular/common';




@Component({
  selector: 'app-create-exam',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule, TaskComponent, NgFor, NgIf, ],
  templateUrl: './create-exam.component.html',
  styleUrl: './create-exam.component.scss'
})
export class CreateExamComponent {

  public inDropzone = false;
  private bodyElement: HTMLElement = document.body;

  public examName = "New Exam"
  tasks:string[] = [];
  public isNameChange = false

  @ViewChild("nameInput") nameInput?:ElementRef;

  @HostListener("document:click", ["$event"])
  unselectInputs(event: MouseEvent) {
    const elementId = (event.target as Element).id

    if (elementId === "examName") {
      return;
    }
    this.isNameChange = false;
    if (!this.nameInput){return;}
    const newName = this.nameInput.nativeElement.value;
    if(newName === ""){return}
    this.examName = newName
  }



  changeName(event:Event){
    console.log(event)

   
  }

  onNameChange(event:any){
    if (event.key !== "Enter"){return}
    const newName = event.target.value;
    if(newName !== ""){
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
    this.tasks.push(element.id);

  }

  dragOverDropzone(event: DragEvent) {
    event.preventDefault();
  }

}


