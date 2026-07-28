import { debounceTime, Subject, Subscription } from 'rxjs';
import {
  Component,
  ChangeDetectionStrategy,
  ViewChildren,
  ViewChild,
  QueryList,
} from '@angular/core';
import { MatTabsModule, MatTabGroup } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { COMMON_IMPORTS } from '../common-imports';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { environment } from '../../../environments/environment';

import { Exam } from '../../types/shared/exam';
import { Task } from '../../types/shared/tasks';
import { Tag } from '../../types/shared/tag';
import { ColorProviderService } from '../../services/color-provider.service';
import { TaskBuilderService } from '../../services/task-builder.service';
import { LoadingService } from '../../services/loading.service';
import { ApiService } from '../../services/api.service';
import { TagHelperService } from '../../services/tag-helper.service';
import { AutosaveService } from '../../services/autosave.service';

import { AddTaskComponent } from './add-task/add-task.component';
import { TaskCardComponent } from './task-card/task-card.component';
import { DraggablePoolComponent } from './draggable-pool/draggable-pool.component';
import { TaskGroupTitleComponent } from './task-group-title/task-group-title.component';

import { TASK_DEFS, PDFTaskInfo } from './edit-exam.types';
import * as preview from './edit-exam.preview';
import * as drag from './edit-exam.drag';
import * as errorHandler from './edit-exam.error-handler';
import * as setup from './edit-exam.setup';
import * as update from './edit-exam.update';
import * as tabs from './edit-exam.tabs';

@Component({
  selector: 'app-edit-exam',
  imports: [
    ...COMMON_IMPORTS,
    AddTaskComponent,
    TaskCardComponent,
    MatTabsModule,
    MatFormFieldModule,
    MatBadgeModule,
    TaskGroupTitleComponent,
    CdkDrag,
    CdkDropList,
    MatSnackBarModule,
    DraggablePoolComponent,
    MatButtonModule,
  ],
  templateUrl: './edit-exam.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './edit-exam.component.scss',
})
export class EditExamComponent {
  public isUpdateMode = false;

  // Pool task tracking — accessed from update slice
  public modifiedPoolTasks: Set<string> = new Set<string>();
  public newTasksToCreate: Set<string> = new Set<string>();
  public tasksWithModifiedTags: {
    taskId: string | undefined;
    tagData: Tag;
  }[] = [];

  public readonly taskDefs = TASK_DEFS;
  public taskPool: Task[] = [];
  public refreshPool$: Subject<void> = new Subject<void>();
  public totalPoints = 0;
  public exam: Exam = new Exam();
  public isExamSetup = false;

  public currentGroupView = 0;
  public selectedTabIndex = 0;
  public readonly publicPath = environment.publicPath;

  public previewPdfUrl: SafeResourceUrl | null = null;

  @ViewChild(MatTabGroup) tabGroup!: MatTabGroup;
  @ViewChildren(TaskCardComponent) taskCards!: QueryList<TaskCardComponent>;

  public isPreviewTabActive = false;
  public previewTabNotification = false;
  // Populated by the preview slice from the X-Subtask-Info response header
  public PDFTasksInfo: PDFTaskInfo[] = [];

  public taskErrors: {
    groupIndex: number;
    taskIndex: number;
    message: string;
  }[] = [];
  public snackbarDismissSub?: Subscription;

  private autosaveTrigger$ = new Subject<void>();
  public previewReady$ = new Subject<void>();

  constructor(
    public api: ApiService,
    public router: Router,
    public colorProvider: ColorProviderService,
    public taskBuilder: TaskBuilderService,
    public dialog: MatDialog,
    public loadingService: LoadingService,
    public sanitizer: DomSanitizer,
    public snackBar: MatSnackBar,
    public tagHelper: TagHelperService,
    public autosaveService: AutosaveService,
  ) {
    this.autosaveTrigger$.pipe(debounceTime(2000)).subscribe(() => {
      // In "Create Mode" (no ID or 'new'), pass undefined so the service uses 'new_draft'
      const idToSave =
        this.exam && this.exam._id && this.exam._id !== 'new'
          ? this.exam._id
          : undefined;
      this.autosaveService.saveLocal(idToSave, this.exam);
    });

    this.importExam();
    this.importPoolTasks();
    if (this.exam.tasks.length === 0) {
      this.exam.tasks = [this.taskBuilder.createDefaultGroup()];
    }
  }

  // ---- Autosave ----

  public triggerAutosave(): void {
    this.autosaveTrigger$.next();
  }

  // ---- Validation ----

  public checkIfValid(): void {
    if (this.exam.courseName === '') {
      alert('Please enter a name for the exam');
      throw new Error('no exam name');
    }

    if (this.exam.semester === '') {
      alert('Please select a semester');
      throw new Error('No semester selected');
    }

    if (this.exam.examinerName === '') {
      alert("Please enter the examiner's name");
      throw new Error('No examiner name');
    }

    if (this.exam.date === '') {
      alert('Please enter the exam date');
      throw new Error('no exam date set');
    }
  }

  // ---- Task utilities (used across slices and the template) ----

  public calcTaskChar(
    index: number,
    groupIndex = this.currentGroupView,
  ): string {
    if (index >= this.exam.tasks[groupIndex].tasks.length) return '';
    // ignore manual text and new page tasks when calculating the task number
    let ignoredCount = 0;
    const tasks = this.exam.tasks[groupIndex].tasks;
    for (let i = 0; i < index; i++) {
      if (tasks[i].type === 'manualText' || tasks[i].type === 'newPage') {
        ignoredCount++;
      }
    }

    return groupIndex + 1 + '.' + this.mapTaskIndexToChar(index - ignoredCount);
  }

  public mapTaskIndexToChar(index: number): string {
    return String.fromCharCode(97 + (index % 26));
  }

  // ---- Save (create mode) ----

  onSave(): void {
    this.checkIfValid();
    this.api.addExam(this.exam).subscribe({
      next: response => {
        this.autosaveService.clearLocal(undefined);
        this.router.navigate([`/edit-exam/${response.insertedId}`]);
      },

      error: err => {
        this.snackBar.open('Could not save exam!', 'OK');
        console.error('Error adding exam: ', err);
      },
    });
  }

  // ---- Task-level changes ----

  onTaskChange(task: Task, index: number): void {
    this.exam.tasks[this.currentGroupView].tasks[index] = task;
    this.exam.fillMeta();
    this.trackChangeInPoolTasks(task._id);
    this.triggerAutosave();
    this.previewTabNotification = false;
  }

  onTitleChange(taskGroupTitle: { DE: string; EN: string }): void {
    this.exam.tasks[this.currentGroupView].groupTitle = taskGroupTitle;
    this.triggerAutosave();
    this.previewTabNotification = false;
  }

  deleteTask(index: number): void {
    this.exam.tasks[this.currentGroupView].tasks.splice(index, 1);
    this.exam.fillMeta();
    this.triggerAutosave();
    this.previewTabNotification = false;
    this.taskErrors = [];
  }

  // ---- Drop-list IDs (template helper) ----

  get taskGroupDropListIds(): string[] {
    return this.exam.tasks.map((_, i) => `task-group-${i}`);
  }

  // ---- Slice method assignments ----

  // Preview
  public onPreview = preview.onPreview;
  public onTaskPreview = preview.onTaskPreview;

  // Drag & drop
  public reorderDrop = drag.reorderDrop;
  public validatePageBreaks = drag.validatePageBreaks;
  public insertNewPage = drag.insertNewPage;

  // Error handling
  public errorHandler = errorHandler.errorHandler;
  public getTaskError = errorHandler.getTaskError;

  // Setup / initialization
  public importExam = setup.importExam;
  public importPoolTasks = setup.importPoolTasks;
  public onSetup = setup.onSetup;

  // Update / pool-task tracking / tag management
  public onUpdate = update.onUpdate;
  public isPoolTask = update.isPoolTask;
  public isModifiedPoolTask = update.isModifiedPoolTask;
  public trackChangeInPoolTasks = update.trackChangeInPoolTasks;
  public onCreateNewTaskChange = update.onCreateNewTaskChange;
  public onAddTag = update.onAddTag;

  // Tabs
  public onTabChange = tabs.onTabChange;
  public addTab = tabs.addTab;
  public deleteTab = tabs.deleteTab;
  public tabLabel = tabs.tabLabel;
  public dropTab = tabs.dropTab;
}
