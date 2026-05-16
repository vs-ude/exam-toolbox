import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Task } from '../../../exam';
import { ColorProviderService } from '../../../services/color-provider.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIcon } from "@angular/material/icon";
import { ApiService } from '../../../services/api.service';
import { forkJoin, Observable, Subscription } from 'rxjs';
import { PoolTaskComponent } from './pool-task/pool-task.component';
import { Tag } from '../../../tag';

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
  imports: [PoolTaskComponent, MatTooltipModule, MatIcon],
  templateUrl: './draggable-pool.component.html',
  styleUrl: './draggable-pool.component.scss'
})
export class DraggablePoolComponent {
  @Input() refreshPool$!: Observable<void>;

  @Output() dragStart = new EventEmitter<DragEvent>();
  @Output() drop = new EventEmitter<DragEvent>();

  public taskPool: Task[] = [];
  public filteredTaskPool: Task[] = [];
  private refreshSubscription: Subscription = new Subscription();

  public SortPoints = SortPoints;
  public sortPoints: SortPoints = SortPoints.None;
  private currentTypeFilter: string = '';
  private currentSearchTerm: string = '';

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

    forkJoin({
      tasks: this.api.getTasksFromPool(),
      tags: this.api.getAllTags()
    }).subscribe({
      next: ({ tasks, tags }) => {
        this.taskPool = (tasks as Task[]).map(task => ({
          ...task,
          tags: (tags as Tag[]).filter(tag => task.tagIds.includes(tag._id!))
        }));
        this.applyCurrentFilters();
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }



  public onFilterType(type: string): void {
    this.currentTypeFilter = type;
    this.applyCurrentFilters();
  }

  public onSortPoints(sort: SortPoints): void {
    if (this.sortPoints !== SortPoints.None) {
      this.sortPoints = SortPoints.None;
      return;
    }
    this.sortPoints = sort;
    this.applyCurrentFilters();
  }

  public onTextSearch(search: string): void {
    this.currentSearchTerm = search;
    this.applyCurrentFilters();
  }

  private applyCurrentFilters(): void {
    this.filteredTaskPool = this.taskPool;
    this.filteredTaskPool = this.filterTasksByType();
    this.filteredTaskPool = this.filterTasksBySearchTerm();
    this.filteredTaskPool = this.sortTasksByPoints();
  }

  private filterTasksByType(): Task[] {
    if (this.currentTypeFilter === "") {
      return this.filteredTaskPool;
    }
    return this.filteredTaskPool.filter(task => task.type === this.currentTypeFilter);
  }

  private filterTasksBySearchTerm(): Task[] {
    if (this.currentSearchTerm === "") {
      return this.filteredTaskPool;
    }
    const lowerSearchTerm = this.currentSearchTerm.toLowerCase();
    return this.filteredTaskPool.filter(task =>
      task.question.DE.toLowerCase().includes(lowerSearchTerm) ||
      task.question.EN.toLowerCase().includes(lowerSearchTerm) ||
      task.tags.some(tag => tag.name.toLowerCase().includes(lowerSearchTerm))
    );
  }



  private sortTasksByPoints(): Task[] {
    if (this.sortPoints === SortPoints.None) {
      return this.filteredTaskPool;
    }
    return this.filteredTaskPool.sort((a, b) => {
      if (this.sortPoints === SortPoints.Ascending) {
        return a.points - b.points;
      } else {
        return b.points - a.points;
      }
    }
    );
  }

}







