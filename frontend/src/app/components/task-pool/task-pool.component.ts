import { NgClass, NgFor, NgIf, NgStyle } from '@angular/common';
import { AfterViewInit, Component, HostListener, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Task } from '../../exam';
import { TaskPoolCardComponent } from '../task-pool-card/task-pool-card.component';
import { MatSort, MatSortModule } from '@angular/material/sort'
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { animate, style, transition, trigger } from '@angular/animations';
import { ApiService } from '../../services/api.service';
import { Tag } from '../../tag';


@Component({
  selector: 'app-task-pool',
  standalone: true,
  imports: [MatIconModule, NgClass, NgFor, TaskPoolCardComponent, MatTableModule, MatSortModule, NgIf, NgStyle],
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
  public filterState: "all" | "createdByMe" | "recentlyUsed" = "all"

  public tasks: Task[] = [];

  displayedColumns: string[] = ['taskId', 'type', 'question', 'points', "tags", "createdBy", "lastUsed",];
  dataSource = new MatTableDataSource<Task>(this.tasks);

  @ViewChild(MatSort) sort?: MatSort;

  constructor(private apiService: ApiService) { }

  ngOnInit() {
    this.apiService.getTasksFromPool().subscribe(
      res => {
        this.tasks = res as Task[];
        this.dataSource = new MatTableDataSource<Task>(this.tasks);
        console.log(this.tasks);
      },
      error => {
        console.error('Error fetching tasks from pool:', error);
      }
    )
  }

  ngAfterViewInit() {
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  public toggleViewMode(mode: 'list' | 'grid') {
    this.viewMode = mode;
    if (mode === 'list') {
      // Allow time for the view to render, then assign sort
      setTimeout(() => {
        if (this.sort) {
          this.dataSource.sort = this.sort;
        }
      });
    }
  }

  public showCreatedByMe() {
    this.filterState = "createdByMe";
    this.apiService.getTaskWithUserIdFromPool("placeholder").subscribe(
      res => {
        this.tasks = res as Task[];
        this.dataSource = new MatTableDataSource<Task>(this.tasks);
      },
      error => {
        console.error('Error fetching tasks by user:', error);
      }
    )
  }

  public showAllTasks() {
    this.filterState = "all";
    this.apiService.getTasksFromPool().subscribe(
      res => {
        this.tasks = res as Task[];
        this.dataSource = new MatTableDataSource<Task>(this.tasks);
      },
      error => {
        console.error('Error fetching all tasks:', error);
      }
    )
  }

  public stringifyDate(date: any): string {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('de-DE');
  }

}
