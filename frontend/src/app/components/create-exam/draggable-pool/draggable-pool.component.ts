import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Task } from '../../../exam';
import { AddTaskComponent } from "../add-task/add-task.component";
import { ColorProviderService } from '../../../services/color-provider.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIcon } from "@angular/material/icon";

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

  @Input() public taskPool!: Task[];

  @Output() dragStart = new EventEmitter<DragEvent>();
  @Output() drop = new EventEmitter<DragEvent>();

  public SortPoints = SortPoints;
  public sortPoints: SortPoints = SortPoints.None;

  public types: TypeOption[] = [
    { value: '', viewValue: 'All Types' },
    { value: 'multipleChoice', viewValue: 'Multiple Choice' },
    { value: 'shortAnswer', viewValue: 'Short Answer' },
    { value: 'pictureTask', viewValue: 'Picture Task' },
    { value: 'newPage', viewValue: 'New Page' },
    { value: 'latex', viewValue: 'LaTeX' },
    { value: 'table', viewValue: 'Table' },
  ]


  constructor(public colorProvider: ColorProviderService) {
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
  }

}







