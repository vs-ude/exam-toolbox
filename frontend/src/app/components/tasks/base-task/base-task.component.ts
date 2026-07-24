import {
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';

import { Task } from '../../../types/shared/tasks';

@Component({
  selector: 'app-base-task',
  imports: [],
  template: '',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: '../task.scss',
})
export abstract class BaseTaskComponent {
  @Input()
  public taskId?: string;
  @Input()
  public preTask?: Task;
  @Input()
  public bilingual?: boolean;
  @Input()
  public isModifiedPoolTask?: boolean;
  @Output()
  deleteEvent = new EventEmitter<string>();
  @Output()
  createNewTaskEvent = new EventEmitter<boolean>();
  @Output()
  newTagEvent = new EventEmitter<void>();
  @Output()
  previewEvent = new EventEmitter();

  abstract taskChangeEvent: EventEmitter<Task>;

  createNewTask: boolean = false;

  public abstract task: Task;

  abstract ngOnInit(): void;

  public updateTask() {
    this.taskChangeEvent.emit(this.task);
  }

  public onQuestionChange(question: { DE: string; EN: string }) {
    this.task.question = question;
    this.taskChangeEvent.emit(this.task);
  }

  public onDelete() {
    this.deleteEvent.emit('delete');
  }

  public onCreateNewTaskChange(state: boolean) {
    this.createNewTask = state;
    this.createNewTaskEvent.emit(this.createNewTask);
  }

  public onAddTag() {
    this.newTagEvent.emit();
  }

  public onPreview() {
    this.previewEvent.emit();
  }
}
