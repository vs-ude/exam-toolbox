import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Task } from '../../../exam';
import { AddTaskComponent } from "../add-task/add-task.component";
import { ColorProviderService } from '../../../services/color-provider.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIcon } from "@angular/material/icon";
import { ApiService } from '../../../services/api.service';
import { Observable, Subscription } from 'rxjs';

enum SortPoints {
  Ascending,
  Descending,
  None,
}

interface TypeOption {
  value: string,
  viewValue: string,
}

@Component({
  selector: 'app-draggable-pool',
  standalone: true,
  imports: [AddTaskComponent, MatTooltipModule, MatIcon],
  templateUrl: './draggable-pool.component.html',
  styleUrl: './draggable-pool.component.scss'
})
export class DraggablePoolComponent {
  @Input() refreshPool$!: Observable<void> ;

  @Output() dragStart = new EventEmitter<DragEvent>();
  @Output() drop = new EventEmitter<DragEvent>();

  public taskPool: Task[] = [];
  private refreshSubscription: Subscription = new Subscription();

  public SortPoints = SortPoints;
  public sortPoints: SortPoints = SortPoints.None;
  private currentTypeFilter: string = '';

  public types: TypeOption[] = [
    { value: '', viewValue: 'All Types' },
    { value: 'multipleChoice', viewValue: 'Multiple Choice' },
    { value: 'shortAnswer', viewValue: 'Short Answer' },
    { value: 'pictureTask', viewValue: 'Picture Task' },
    { value: 'newPage', viewValue: 'New Page' },
    { value: 'latex', viewValue: 'LaTeX' },
    { value: 'table', viewValue: 'Table' },
  ]

  ngOnInit(): void {
    this.refreshSubscription = this.refreshPool$.subscribe(() => {
      this.refreshTaskPool();
    });
  }

  ngOnDestroy(): void {
    this.refreshSubscription.unsubscribe();
  }


  constructor(public colorProvider: ColorProviderService, private api: ApiService) {
    this.refreshTaskPool();
  }

  private refreshTaskPool(): void {
    this.api.getTasksFromPool().subscribe(
      (tasks) => { 
        this.taskPool = tasks;

        if (this.currentTypeFilter !== ''){
          this.onFilterType(this.currentTypeFilter);
        }
        this.sortTasksByPoints();
       },
      (error) => { console.error('Error fetching tasks from pool:', error); }
    );
  }

  public onFilterType(type: string): void {
    this.currentTypeFilter = type;
    if (type === '') {
      this.refreshTaskPool();
      return;
    }

    this.api.getTaskWithTypeFromPool(type).subscribe(
      (tasks) => {
        this.taskPool = tasks;
        this.sortTasksByPoints();
      },
      (error) => { console.error('Error fetching tasks from pool by type:', error); }
    );
  }


  public onSearch(search: string): void {
    console.log("Searching for tasks with term: ", search);
  }

  public onSortPoints(sort: SortPoints): void {
    if (this.sortPoints !== SortPoints.None) {
      this.sortPoints = SortPoints.None;
      return;
    }
    this.sortPoints = sort;
    this.sortTasksByPoints();
  }

  private sortTasksByPoints(): void {
    if (this.sortPoints === SortPoints.Ascending) {
      this.taskPool.sort((a, b) => a.points - b.points);
    } else if (this.sortPoints === SortPoints.Descending) {
      this.taskPool.sort((a, b) => b.points - a.points);
    }
  }

}







