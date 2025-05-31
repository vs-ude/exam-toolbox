import { NgClass, NgFor } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Task } from '../../exam';
import { TaskPoolCardComponent } from '../task-pool-card/task-pool-card.component';

@Component({
  selector: 'app-task-pool',
  standalone: true,
  imports: [MatIconModule, NgClass, NgFor, TaskPoolCardComponent ],
  templateUrl: './task-pool.component.html',
  styleUrl: './task-pool.component.scss'
})
export class TaskPoolComponent {

  constructor() { }

  ngOnInit() {
  }

  @HostListener("document:click", ["$event"])
    handleDropdownStates(event: MouseEvent) {
      const elementId = (event.target as Element).id
  
      if (elementId === "openSortingDropdown") {
        this.showDropdowns.sorting = !this.showDropdowns.sorting;
      } else { this.showDropdowns.sorting = false; }
  
      if (elementId === "openFilterDropdown") {
        this.showDropdowns.filter = !this.showDropdowns.filter;
      } else { this.showDropdowns.filter = false; }
    }
  
    public showDropdowns = { sorting: false, filter: false, }
    public tasks: Task[] = [{
      taskId: "multipleChoice-1748525128025",
      type: "multipleChoice",
      question: {
        DE: "Was ist die Hauptstadt von Deutschland?",
        EN: "What is the capital of Germany?"
      },
      points: 5,
      answerOptions: [
        { DE: "Berlin", EN: "Berlin", correct: true },
        { DE: "München", EN: "Munich", correct: false },
        { DE: "Hamburg", EN: "Hamburg", correct: false },
        { DE: "Köln", EN: "Cologne", correct: false },
      ]
     },
    {
      taskId: "multipleChoice-1748525128025",
      type: "shortAnswer",
      question: {
        DE: "Was ist die Hauptstadt von Deutschland?",
        EN: "What is the capital of Germany?"
      },
      points: 5,
      solution: {
        DE: "Berlin",
        EN: "Berlin"
      },
     }]
}
