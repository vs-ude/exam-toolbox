import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Task } from '../../../../types/shared/tasks';
import { Tag } from '../../../../types/shared/tag';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-base-task',
  standalone: true,
  imports: [],
  template: '',
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
  @ViewChild('questionFieldDE')
  questionFieldDE!: ElementRef;
  @ViewChild('questionFieldEN')
  questionFieldEN?: ElementRef;

  abstract taskChangeEvent: EventEmitter<Task>;

  isBold: boolean = false;
  isItalic: boolean = false;
  isUnderline: boolean = false;
  isQuestionActive: boolean = false;
  languageChanged: boolean = false;
  createNewTask: boolean = false;

  public abstract task: Task;

  abstract ngOnInit(): void;

  ngAfterViewInit() {
    this.questionFieldDE.nativeElement.innerHTML = this.task.question.DE;

    if (this.questionFieldEN == undefined) return;
    this.questionFieldEN.nativeElement.innerHTML = this.task.question.EN;
  }

  ngOnChanges(changes: SimpleChanges): void {
    for (const propName in changes) {
      if (changes.hasOwnProperty(propName)) {
        switch (propName) {
          case 'bilingual': {
            this.languageChanged = true;
          }
        }
      }
    }
  }

  ngAfterViewChecked(): void {
    if (!this.languageChanged) return;
    this.languageChanged = false;

    this.questionFieldDE.nativeElement.innerHTML = this.task.question.DE;

    if (this.questionFieldEN == undefined) return;
    this.questionFieldEN.nativeElement.innerHTML = this.task.question.EN;
  }

  public activateFormatButtons() {
    this.isQuestionActive = true;
  }

  public deactivateFormatButtons(event: FocusEvent) {
    this.isQuestionActive = false;
  }

  public setQuestionFormat(format: string, event: MouseEvent) {
    event.preventDefault();
    document.execCommand(format);
    this.updateButtonStates();
  }

  private updateButtonStates() {
    this.isBold = document.queryCommandState('bold');
    this.isItalic = document.queryCommandState('italic');
    this.isUnderline = document.queryCommandState('underline');
  }

  public onDelete() {
    this.deleteEvent.emit('delete');
  }

  public updateQuestion(event: Event, language: string) {
    const element = event.target as HTMLElement;
    if (language === 'DE') {
      this.task.question.DE = element.innerHTML;
    } else {
      this.task.question.EN = element.innerHTML;
    }

    this.taskChangeEvent.emit(this.task);
  }

  public updateTask() {
    this.taskChangeEvent.emit(this.task);
  }

  public onCreateNewTaskChange(state: boolean) {
    console.log('Create New Task state changed to:', state);
    this.createNewTask = state;
    this.createNewTaskEvent.emit(this.createNewTask);
    console.log('Emitted createNewTaskEvent with value:', this.createNewTask);
  }

  public onAddTag() {
    this.newTagEvent.emit();
  }

  public onPreview() {
    this.previewEvent.emit();
  }
}
