import { NgStyle } from '@angular/common';
import {
  Component,
  EventEmitter,
  input,
  Input,
  NgModule,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { Task } from '../../../../../types/shared/tasks';

@Component({
  selector: 'app-task-footer',
  standalone: true,
  imports: [MatIcon, FormsModule, NgStyle, MatLabel],
  templateUrl: './task-footer.component.html',
  styleUrl: './task-footer.component.scss',
})
export class TaskFooterComponent {
  @Input() public isModifiedPoolTask?: boolean;
  @Input() public task!: Task;
  @Input() public createNewTask: boolean = false;
  @Input() public hasNoPoints?: boolean;
  @Input() public hasNoPreview?: boolean;
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

  public onCreateNewTaskChange() {
    this.createNewTaskEvent.emit(this.createNewTask);
  }

  public onPreview() {
    this.previewEvent.emit();
  }

  public updateTask() {
    this.taskChangeEvent.emit(this.task);
  }
}
