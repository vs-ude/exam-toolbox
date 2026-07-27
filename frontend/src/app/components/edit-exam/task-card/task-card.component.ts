import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  Type,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

import { Task } from '../../../types/shared/tasks';
import { BaseTaskComponent } from '../../tasks/base-task/base-task.component';
import { ManualTextComponent } from '../../tasks/manual-text/manual-text.component';
import { MultiplechoiceTaskComponent } from '../../tasks/multipleChoiceTask/multiplechoice-task.component';
import { ShortAnswerTaskComponent } from '../../tasks/short-answer-task/short-answer-task.component';
import { PictureTaskComponent } from '../../tasks/picture-task/picture-task.component';
import { LatexTaskComponent } from '../../tasks/latex-task/latex-task.component';
import { TableTaskComponent } from '../../tasks/table-task/table-task.component';
import { NewPageComponent } from '../../tasks/new-page/new-page.component';

const TASK_COMPONENT_MAP: Record<string, Type<BaseTaskComponent>> = {
  multipleChoice: MultiplechoiceTaskComponent,
  shortAnswer: ShortAnswerTaskComponent,
  pictureTask: PictureTaskComponent,
  latex: LatexTaskComponent,
  table: TableTaskComponent,
  manualText: ManualTextComponent,
  newPage: NewPageComponent,
};

@Component({
  selector: 'app-task-card',
  imports: [CdkDrag, CdkDragHandle, MatCard, MatIcon, NgClass, MatTooltip],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class TaskCardComponent implements AfterViewInit, OnChanges, OnDestroy {
  constructor(public elementRef: ElementRef<HTMLElement>) {}
  @Input() subtaskId?: string = '';
  @Input() task!: Task;
  @Input() bilingual?: boolean;
  @Input() isModifiedPoolTask?: boolean;
  @Input() errorMessage?: string;

  @Output() taskChangeEvent = new EventEmitter<Task>();
  @Output() createNewTaskEvent = new EventEmitter<boolean>();
  @Output() deleteEvent = new EventEmitter<void>();
  @Output() newTagEvent = new EventEmitter<void>();
  @Output() previewEvent = new EventEmitter<void>();

  @ViewChild('host', { read: ViewContainerRef }) host!: ViewContainerRef;

  private componentRef?: ComponentRef<BaseTaskComponent>;
  private viewInitialised = false;

  ngAfterViewInit(): void {
    if (this.task.type === 'manualText' || this.task.type === 'newPage') {
      this.subtaskId = '';
    }

    this.viewInitialised = true;
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewInitialised) return;
    if (this.task.type === 'manualText' || this.task.type === 'newPage') {
      this.subtaskId = '';
    }

    if (changes['task'] && !changes['task'].firstChange) {
      this.render();
      return;
    }
    if (this.componentRef) {
      this.applyInputs(this.componentRef.instance);
    }
  }

  ngOnDestroy(): void {
    this.componentRef?.destroy();
  }

  private render(): void {
    this.componentRef?.destroy();
    const type = TASK_COMPONENT_MAP[this.task.type];
    if (!type) return;

    this.componentRef = this.host.createComponent(type);
    const inst = this.componentRef.instance;
    this.applyInputs(inst);

    inst.taskChangeEvent.subscribe((t: Task) => this.taskChangeEvent.emit(t));
    inst.deleteEvent.subscribe(() => this.deleteEvent.emit());
    inst.createNewTaskEvent.subscribe((v: boolean) =>
      this.createNewTaskEvent.emit(v),
    );
    inst.newTagEvent.subscribe(() => this.newTagEvent.emit());
    inst.previewEvent.subscribe(() => this.previewEvent.emit());
  }

  private applyInputs(inst: BaseTaskComponent): void {
    inst.taskId = this.task._id;
    inst.preTask = this.task;
    inst.bilingual = this.bilingual;
    inst.isModifiedPoolTask = this.isModifiedPoolTask;
  }
}
