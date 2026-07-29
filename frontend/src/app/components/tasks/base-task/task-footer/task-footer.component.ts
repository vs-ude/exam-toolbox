import {
  Component,
  EventEmitter,
  input,
  Input,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Task } from '../../../../types/shared/tasks';

@Component({
  selector: 'app-task-footer',
  imports: [
    MatIcon,
    FormsModule,
    NgStyle,
    MatLabel,
    MatTooltip,
    MatCheckbox,
    MatInputModule,
    MatFormFieldModule,
  ],
  templateUrl: './task-footer.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./task-footer.component.scss', '../../task.scss'],
})
export class TaskFooterComponent {
  @Input() public isModifiedPoolTask?: boolean;
  @Input() public task!: Task;
  @Input() public createNewTask: boolean = false;
  @Input() public hasNoPoints?: boolean;
  @Input() public hasNoPreview?: boolean;
  /** 'total' binds directly to task.points; 'per-line' shows a separate per-line input. */
  @Input() public pointsMode: 'total' | 'per-line' = 'total';
  @Input() public pointsPerLineLabel: string = 'per line';
  @Input() public points: number = 1;
  @Output() pointsPerLineValueChange = new EventEmitter<number>();
  @Output() deleteEvent = new EventEmitter<string>();
  @Output() createNewTaskEvent = new EventEmitter<boolean>();
  @Output() newTagEvent = new EventEmitter<void>();
  @Output() previewEvent = new EventEmitter();
  @Output() taskChangeEvent = new EventEmitter<Task>();

  public onDelete() {
    this.deleteEvent.emit();
  }

  public onAddTag() {
    this.newTagEvent.emit();
  }

  public onCreateNewTaskChange(checked: boolean) {
    this.createNewTask = checked;
    this.createNewTaskEvent.emit(checked);
  }

  public onPreview() {
    this.previewEvent.emit();
  }

  public updateTask() {
    this.taskChangeEvent.emit(this.task);
  }

  public onPointsChange() {
    if (this.pointsMode === 'per-line') {
      this.pointsPerLineValueChange.emit(this.points);
    } else {
      this.task.points = this.points;
      this.updateTask();
    }
  }
}
