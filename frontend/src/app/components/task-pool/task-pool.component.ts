import { NgClass, NgFor, NgIf } from '@angular/common';
import { AfterViewInit, Component, HostListener, inject, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Task } from '../../exam';
import { TaskPoolCardComponent } from '../task-pool-card/task-pool-card.component';
import { MatSort, Sort, MatSortModule } from '@angular/material/sort'
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { animate, style, transition, trigger } from '@angular/animations';


@Component({
  selector: 'app-task-pool',
  standalone: true,
  imports: [MatIconModule, NgClass, NgFor, TaskPoolCardComponent, MatTableModule, MatSortModule, NgIf],
  templateUrl: './task-pool.component.html',
  styleUrl: './task-pool.component.scss',
  animations: [
    trigger(
      'leftRightAnimation',
      [
        transition(
          ':enter',
          [
            style({ height: 0, opacity: 0, transform: 'translateX(100%)' }),
            animate('0.25s ease-out',
              style({ height: '*', opacity: 1, transform: 'translateX(0%)' })
            )
          ]
        ),
        transition(
          ':leave',
          [
            style({ height: '*', opacity: 1, transform: 'translateX(0%)' }),
            animate('0.25s ease-in',
              style({ height: 0, opacity: 0, transform: 'translateX(-100%)' })
            )
          ]
        )
      ],

    ),

  ]
})
export class TaskPoolComponent implements AfterViewInit {

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
  public viewMode: 'list' | 'grid' = 'grid';

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
    taskId: "shortAnswer-1749196671991",
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
  }];

  displayedColumns: string[] = ['taskId', 'type', 'question', 'points',];
  dataSource = new MatTableDataSource<Task>(this.tasks);

  @ViewChild(MatSort) sort!: MatSort;

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }

  public toggleViewMode(mode: 'list' | 'grid') {
    this.viewMode = mode;
  }

}
