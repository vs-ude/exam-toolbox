import {
  debounceTime,
  forkJoin,
  Observable,
  retry,
  Subject,
  Subscription,
  take,
} from 'rxjs';
import {
  Component,
  ChangeDetectionStrategy,
  ViewChildren,
  ViewChild,
  QueryList,
} from '@angular/core';
import { MatTabsModule, MatTabGroup } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { COMMON_IMPORTS } from '../common-imports';
import { Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { HttpResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { environment } from '../../../environments/environment';

import { Exam, parseExam } from '../../types/shared/exam';
import { Task } from '../../types/shared/tasks';
import { UserStub } from '../../types/shared/stubs';
import { Tag } from '../../types/shared/tag';
import { ColorProviderService } from '../../services/color-provider.service';
import { TaskBuilderService } from '../../services/task-builder.service';
import { LoadingService } from '../../services/loading.service';
import { ApiService } from '../../services/api.service';
import { TagHelperService } from '../../services/tag-helper.service';
import { AutosaveService } from '../../services/autosave.service';
import { truncateString, stripHTML } from '../../services/helpers.service';

import {
  AddTagDialogComponent,
  AddTagDialogData,
} from '../add-tag-dialog/add-tag-dialog.component';
import { MassExamDialogComponent } from '../mass-exam-dialog/mass-exam-dialog.component';
import { UpdateTaskDialogComponent } from '../update-task-dialog/update-task-dialog.component';
import { ConflictDialogComponent } from '../conflict-dialog/conflict-dialog.component';
import {
  ExamSetupDialogComponent,
  ExamSetupDialogData,
} from '../exam-setup-dialog/exam-setup-dialog.component';
import { AddTaskComponent } from './add-task/add-task.component';
import { TaskCardComponent } from './task-card/task-card.component';
import { DraggablePoolComponent } from './draggable-pool/draggable-pool.component';
import { NewPageDialogComponent } from './new-page-dialog/new-page-dialog.component';
import { TaskGroupTitleComponent } from './task-group-title/task-group-title.component';

interface AddTaskDef {
  name: string;
  type: string;
  iconName: string;
  dataCy?: string;
}

const TASK_DEFS: AddTaskDef[] = [
  {
    name: 'Multiple Choice',
    type: 'multipleChoice',
    iconName: 'multipleChoice.svg',
  },
  {
    name: 'Short Answer',
    type: 'shortAnswer',
    iconName: 'shortAnswer.svg',
    dataCy: 'short-answer',
  },
  { name: 'New Page', type: 'newPage', iconName: 'newPage.svg' },
  { name: 'Picture Task', type: 'pictureTask', iconName: 'pictureTask.svg' },
  { name: 'Latex Task', type: 'latex', iconName: 'latex.svg' },
  { name: 'Table Task', type: 'table', iconName: 'table.svg' },
  { name: 'Manual Text', type: 'manualText', iconName: 'manualText.svg' },
];

interface PDFTaskInfo {
  page: number;
  logFileBoundaryError: boolean;
}

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
  ],
  templateUrl: './edit-exam.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './edit-exam.component.scss',
})
export class EditExamComponent {
  public isUpdateMode = false;

  private modifiedPoolTasks: Set<string> = new Set<string>();
  private newTasksToCreate: Set<string> = new Set<string>();
  private tasksWithModifiedTags: {
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
  public readonly publicPath = environment.publicPath;

  public previewPdfUrl: SafeResourceUrl | null = null;

  @ViewChild(MatTabGroup) tabGroup!: MatTabGroup;
  @ViewChildren(TaskCardComponent) taskCards!: QueryList<TaskCardComponent>;

  public isPreviewTabActive = false;
  public previewTabNotification = false;
  private PDFTasksInfo: PDFTaskInfo[] = [];

  public taskErrors: {
    groupIndex: number;
    taskIndex: number;
    message: string;
  }[] = [];
  private snackbarDismissSub?: Subscription;

  private autosaveTrigger$ = new Subject<void>();
  private previewReady$ = new Subject<void>();

  constructor(
    private api: ApiService,
    private router: Router,
    public colorProvider: ColorProviderService,
    private taskBuilder: TaskBuilderService,
    private dialog: MatDialog,
    private loadingService: LoadingService,
    private sanitizer: DomSanitizer,
    private snackBar: MatSnackBar,
    private tagHelper: TagHelperService,
    private autosaveService: AutosaveService,
  ) {
    this.autosaveTrigger$.pipe(debounceTime(2000)).subscribe(() => {
      // If we are in "Create Mode" (no ID or 'new'), pass undefined to service (it handles 'new_draft')
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

  private triggerAutosave() {
    this.autosaveTrigger$.next();
  }

  onSave() {
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

  onPreview() {
    this.checkIfValid();
    this.loadingService.loadingOn();
    const exam = this.api.previewExam(this.exam);
    exam.subscribe({
      next: (response: HttpResponse<Blob>) => {
        const pdfBlob = response.body;
        if (pdfBlob) {
          if (this.previewPdfUrl) {
            const oldUrl = this.sanitizer.sanitize(
              4,
              this.previewPdfUrl,
            ) as string; // 4 = ResourceUrl
            if (oldUrl) URL.revokeObjectURL(oldUrl);
          }

          const objectUrl = URL.createObjectURL(pdfBlob);
          this.previewPdfUrl =
            this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl);
          this.previewTabNotification = true;
          this.snackBar.open('Preview has been updated!', 'Dismiss', {
            duration: 3000,
          });
        }

        const subtaskHeader = response.headers.get('X-Subtask-Info');
        const subtaskInfo: PDFTaskInfo[] = subtaskHeader
          ? JSON.parse(subtaskHeader)
          : [];
        this.PDFTasksInfo = subtaskInfo;
        console.log('Subtask Info from header:', subtaskInfo);

        const errorIndex = subtaskInfo.findIndex(
          info => info.logFileBoundaryError,
        );
        if (errorIndex !== -1) {
          console.warn(
            'Log file boundary errors detected, inserting new pages accordingly.',
          );
          this.insertNewPage(errorIndex);
        }

        this.taskErrors = [];
        this.loadingService.loadingOff();
        this.previewReady$.next();
      },
      error: err => {
        this.loadingService.loadingOff();
        this.errorHandler(err);
      },
    });
  }

  public onTaskPreview(index: number) {
    this.onPreview();
    this.previewReady$.pipe(take(1)).subscribe({
      next: () => {
        const pageNumber = this.getPDFPageNumber(index, this.currentGroupView);

        // Update the PDF URL to jump to the specific page
        const baseUrl = this.sanitizer.sanitize(
          4,
          this.previewPdfUrl,
        ) as string;
        const pageUrl = baseUrl + '#page=' + pageNumber;
        this.previewPdfUrl =
          this.sanitizer.bypassSecurityTrustResourceUrl(pageUrl);

        // this.changeTab(this.exam.tasks.length); // switch to preview tab
      },
      error: (err: any) => {
        this.loadingService.loadingOff();
        this.errorHandler(err);
      },
    });
  }

  deleteTask(index: number) {
    this.exam.tasks[this.currentGroupView].tasks.splice(index, 1);
    this.exam.fillMeta();
    this.triggerAutosave();
    this.previewTabNotification = false;
    this.taskErrors = [];
  }

  // ------------------------
  // Drag-and-drop functions
  //
  reorderDrop(event: CdkDragDrop<Task[]>) {
    if (event.previousContainer === event.container) {
      // internal reorder within the task list
      if (
        this.exam.tasks[this.currentGroupView].tasks[event.previousIndex]
          ?.type == 'newPage' &&
        !this.validatePageBreaks(event.currentIndex, event.previousIndex)
      ) {
        return;
      }
      moveItemInArray(
        this.exam.tasks[this.currentGroupView].tasks,
        event.previousIndex,
        event.currentIndex,
      );
    } else {
      // external drop from add-tasks or pool source lists
      const data = event.item.data as
        | { source: 'new'; taskType: string }
        | { source: 'pool'; taskId: string };
      if (data.source === 'new') {
        this.pushNewTask(data.taskType, event.currentIndex);
      } else {
        this.pushPoolTask(data.taskId, event.currentIndex);
      }
    }
    this.triggerAutosave();
    this.previewTabNotification = false;
    this.taskErrors = [];
  }

  validatePageBreaks(insertIndex: number, sourceIndex?: number): boolean {
    if (insertIndex === 0) {
      this.snackBar.open(
        'A page break cannot be the first element in an assignment',
        'OK',
        {
          duration: 4000,
        },
      );
      return false;
    }

    let checks: number[] = [];
    if (sourceIndex !== undefined && sourceIndex == insertIndex) {
      // no-op
      return true;
    } else if (sourceIndex === undefined) {
      // newly added task pushes down the insertIndex task
      checks.push(insertIndex, insertIndex - 1);
    } else if (sourceIndex < insertIndex) {
      // Task moved downwards; check target and below
      checks.push(insertIndex, insertIndex + 1);
    } else {
      // Task moved upwards; check target and above
      checks.push(insertIndex, insertIndex - 1);
    }

    const checkTarget = (index: number): boolean => {
      if (
        this.exam.tasks[this.currentGroupView] &&
        this.exam.tasks[this.currentGroupView].tasks[index] &&
        this.exam.tasks[this.currentGroupView].tasks[index].type === 'newPage'
      ) {
        return true;
      }
      return false;
    };

    if (checks.some(index => checkTarget(index))) {
      this.snackBar.open('Consecutive page breaks are not allowed', 'OK', {
        duration: 4000,
      });
      return false;
    }
    return true;
  }

  private pushNewTask(taskType: string, index?: number) {
    const targetIndex =
      index ?? this.exam.tasks[this.currentGroupView].tasks.length;
    if (taskType == 'new_newPage' && !this.validatePageBreaks(targetIndex)) {
      return;
    }
    let task = this.taskBuilder.createTask(taskType);
    task.usedIn = [this.exam._id!];
    this.exam.tasks[this.currentGroupView].tasks.splice(targetIndex, 0, task);
    this.exam.fillMeta();
    this.previewTabNotification = false;
  }

  private pushPoolTask(taskId: string, index?: number) {
    const task = this.taskPool.find(element => element._id === taskId);
    if (task == undefined) {
      console.warn("couldn't find task");
      return;
    }

    // update Task Metadata
    if (!task.usedIn.includes(this.exam._id || 'placeholder_id')) {
      task.usedIn.push(this.exam._id || 'placeholder_id');
    }
    task.lastUsed = new Date();

    //create new instance of the task to avoid modifying the pool task when editing the task in the exam
    const newTaskInstance = JSON.parse(JSON.stringify(task)) as Task;

    const targetIndex =
      index ?? this.exam.tasks[this.currentGroupView].tasks.length;
    this.exam.tasks[this.currentGroupView].tasks.splice(
      targetIndex,
      0,
      newTaskInstance,
    );
    this.exam.fillMeta();
    this.previewTabNotification = false;
  }

  get taskGroupDropListIds(): string[] {
    return this.exam.tasks.map((_, i) => `task-group-${i}`);
  }

  private insertNewPage(absoluteIndex: number) {
    // Reverse-map the flat subtask index back to (groupIndex, taskIndex) using the
    // same skip rules as generation.ts: single-newPage groups are skipped entirely;
    // newPage and manualText tasks within a group are skipped.
    let count = 0;
    let assignmentIndex = -1;
    let taskIndex = -1;
    outer: for (let g = 0; g < this.exam.tasks.length; g++) {
      const group = this.exam.tasks[g];
      if (group.tasks.length === 1 && group.tasks[0].type === 'newPage') {
        continue;
      }
      for (let i = 0; i < group.tasks.length; i++) {
        const task = group.tasks[i];
        if (task.type === 'newPage' || task.type === 'manualText') continue;
        if (count === absoluteIndex) {
          assignmentIndex = g;
          taskIndex = i;
          break outer;
        }
        count++;
      }
    }
    if (assignmentIndex === -1 || taskIndex === -1) return;

    const subtaskChar = this.calcTaskChar(taskIndex, assignmentIndex);
    const result = this.askForNewPageAutoInsert(
      this.exam.tasks[assignmentIndex].tasks[taskIndex],
      `${assignmentIndex + 1}.${subtaskChar}`,
    );
    result.subscribe(auto => {
      if (!auto) {
        return;
      }
      const newPageElement = this.taskBuilder.createTask('new_newPage');
      this.exam.tasks[assignmentIndex].tasks.splice(
        taskIndex,
        0,
        newPageElement,
      );
      this.triggerAutosave();
      this.previewTabNotification = false;
    });
  }

  private askForNewPageAutoInsert(task: Task, taskNumber: string) {
    const dialogRef = this.dialog.open(NewPageDialogComponent, {
      width: '30%',
      height: '30%',
      data: { taskNumber: taskNumber, task: task },
    });
    return dialogRef.afterClosed();
  }

  private checkIfValid() {
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

  onTaskChange(task: Task, index: number) {
    this.exam.tasks[this.currentGroupView].tasks[index] = task;
    this.exam.fillMeta();
    this.trackChangeInPoolTasks(task._id);
    this.triggerAutosave();
    this.previewTabNotification = false;
  }

  // FIXME: this is broken; tasks are always overwritten
  private trackChangeInPoolTasks(id: string | undefined) {
    if (id && this.isPoolTask(id)) {
      this.modifiedPoolTasks.add(id);
    }
  }

  public isPoolTask(id: string | undefined): boolean {
    return !!id && this.taskPool.some(poolTask => poolTask._id === id);
  }

  public isModifiedPoolTask(id: string | undefined): boolean {
    if (!this.isPoolTask(id)) {
      return false;
    }
    return this.modifiedPoolTasks.has(id!);
  }

  public onCreateNewTaskChange(newTask: boolean, index: number) {
    const id = this.exam.tasks[this.currentGroupView].tasks[index]._id;
    if (!id) return;
    if (newTask) {
      this.newTasksToCreate.add(id);
      return;
    }
    this.newTasksToCreate.delete(id);
  }

  onTitleChange(taskGroupTitle: { DE: string; EN: string }) {
    this.exam.tasks[this.currentGroupView].groupTitle = taskGroupTitle;
    this.triggerAutosave();
    this.previewTabNotification = false;
  }

  onUpdate() {
    this.checkIfValid();
    if (this.modifiedPoolTasks.size === 0) {
      this.submitUpdateExam();
      return;
    }
    const modifiedIndices = this.getModifiedIndices();
    this.askUserForTaskUpdate(modifiedIndices);
  }

  private getModifiedIndices(): [number, number][] {
    const modifiedIndices: [number, number][] = [];
    for (let i = 0; i < this.exam.tasks.length; i++) {
      for (let j = 0; j < this.exam.tasks[i].tasks.length; j++) {
        const task = this.exam.tasks[i].tasks[j];
        if (
          this.isPoolTask(task._id) &&
          !!task._id &&
          this.modifiedPoolTasks.has(task._id)
        ) {
          modifiedIndices.push([i, j]);
        }
      }
    }
    return modifiedIndices;
  }

  private askUserForTaskUpdate(modifiedIndices: [number, number][]) {
    const tasks = modifiedIndices.map(([i, j]) => {
      const task = this.exam.tasks[i].tasks[j];
      return {
        assignmentNumber: `${i + 1}.${this.mapTaskIndexToChar(j)}`,
        task,
        newTask: !!task._id && this.newTasksToCreate.has(task._id),
      };
    });

    const dialogRef = this.dialog.open(UpdateTaskDialogComponent, {
      width: '50%',
      height: '50%',
      data: tasks,
    });

    dialogRef.afterClosed().subscribe((results: boolean[]) => {
      if (!results) return;
      for (let index = 0; index < results.length; index++) {
        if (results[index]) {
          // User chose to create a new task: detach from existing pool entry
          this.prepareNewTask(modifiedIndices[index]);
        }
        // false = overwrite: task keeps its _id, backend will update it in-place
      }
      this.submitUpdateExam();
    });
  }

  /** Detaches a task from its pool entry so the backend creates a new one. */
  private prepareNewTask(index: [number, number]) {
    const [i, j] = index;
    const oldTask = this.exam.tasks[i].tasks[j];
    const newTask: Task = JSON.parse(JSON.stringify(oldTask));
    newTask.parent = oldTask._id;
    newTask.children = [];
    delete newTask._id;
    this.exam.tasks[i].tasks[j] = newTask;
  }

  private submitUpdateExam() {
    this.api.updateExam(this.exam._id!, this.exam).subscribe({
      next: () => {
        this.snackBar.open('Exam saved successfully', 'Close', {
          duration: 3000,
        });
        this.autosaveService.clearLocal(this.exam._id);
        this.modifiedPoolTasks.clear();
        this.newTasksToCreate.clear();
        // Re-fetch the exam so in-memory task IDs match what the backend assigned
        this.api.getExam(this.exam._id!).subscribe({
          next: updated => {
            this.exam = updated;
            this.importPoolTasks();
          },
          error: err => {
            console.error('Error re-fetching exam after update:', err);
            this.snackBar.open('Error after saving the exam', 'Close', {
              duration: 10000,
            });
          },
        });
      },
      error: err => {
        console.error('Error saving exam: ', err);
        this.snackBar.open('Error during save', 'Close', { duration: 10000 });
      },
    });
  }

  private importExam() {
    const lastURLPart = this.router.url.split('/').pop();

    if (lastURLPart === 'create-exam' || lastURLPart == undefined) {
      this.isUpdateMode = false;

      const draft = this.autosaveService.loadLocal(undefined);

      if (draft) {
        const dialogRef = this.dialog.open(ConflictDialogComponent, {
          width: '600px',
          disableClose: true,
          data: {
            dbExam: new Exam('New Exam', '', '', '', 90, []),
            localWrapper: draft,
            isNewExam: true,
          },
        });

        dialogRef.afterClosed().subscribe((resume: boolean) => {
          if (resume) {
            this.exam = draft.data;
            this.isExamSetup = true;
            this.exam.fillMeta();
            this.snackBar.open('Resumed unsaved new exam.', 'OK', {
              duration: 3000,
            });
          } else {
            this.autosaveService.clearLocal(undefined);
            this.openSetupDialog();
          }
        });
      } else {
        this.openSetupDialog();
      }
      return;
    }

    this.exam._id = lastURLPart;
    this.isUpdateMode = true;

    this.api.getExam(lastURLPart).subscribe(
      dbExam => {
        const localWrapper = this.autosaveService.loadLocal(dbExam._id);
        const dbTime = (dbExam as any).updatedAt
          ? new Date((dbExam as any).updatedAt).getTime()
          : 0;

        if (localWrapper && localWrapper.timestamp > dbTime) {
          const dialogRef = this.dialog.open(ConflictDialogComponent, {
            width: '600px',
            disableClose: true,
            data: { dbExam: dbExam, localWrapper: localWrapper },
          });

          dialogRef.afterClosed().subscribe((useLocal: boolean) => {
            if (useLocal) {
              this.exam = localWrapper.data;
              this.exam._id = dbExam._id;
              this.exam.fillMeta();
              this.snackBar.open('Unsaved changes restored.', 'OK', {
                duration: 3000,
              });
            } else {
              this.initializeExamData(dbExam);
              this.autosaveService.clearLocal(dbExam._id);
              this.snackBar.open('Discarded local draft.', 'OK', {
                duration: 3000,
              });
            }
          });
        } else {
          if (localWrapper) this.autosaveService.clearLocal(dbExam._id);
          this.initializeExamData(dbExam);
        }
      },
      error => console.error(error),
    );
  }

  private initializeExamData(response: Exam) {
    this.exam = parseExam(response);
    this.isExamSetup = true;
    for (let taskGroup of this.exam.tasks) {
      for (let task of taskGroup.tasks) {
        this.tagHelper.importTagsToTask(task);
        console.log('importing tags for task', task);
      }
    }
    this.exam.fillMeta();
  }

  private importPoolTasks() {
    forkJoin({
      tasks: this.api.getTasksFromPool(),
      tags: this.api.getAllTags(),
    }).subscribe({
      next: ({ tasks, tags }) => {
        this.taskPool = tasks.map(task => ({
          ...task,
          tags: tags.filter(tag => task.tagIds.includes(tag._id!)),
        }));
        this.refreshPool$.next();
      },
      error: error => {
        console.error(error);
      },
    });
  }

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

  private mapTaskIndexToChar(index: number) {
    return String.fromCharCode(97 + (index % 26));
  }

  onSetup() {
    this.openSetupDialog();
  }

  private openSetupDialog() {
    const data: ExamSetupDialogData = this.isExamSetup
      ? { exam: this.exam }
      : {};
    this.dialog
      .open(ExamSetupDialogComponent, { width: '560px', data })
      .afterClosed()
      .subscribe((result: Exam | null) => {
        if (!result) return;
        if (this.isExamSetup) {
          Object.assign(this.exam, result);
        } else {
          this.exam = result;
          if (this.exam.tasks.length === 0) {
            this.exam.tasks = [this.taskBuilder.createDefaultGroup()];
          }
          this.isExamSetup = true;
        }
        this.triggerAutosave();
      });
  }

  public onAddTag(index: number) {
    console.log('add tag for task with index ', index);
    const dialogRef: MatDialogRef<AddTagDialogComponent, AddTagDialogData> =
      this.dialog.open(AddTagDialogComponent, {
        width: '50%',
        height: '50%',
        data: {},
      });
    dialogRef.afterClosed().subscribe(result => {
      if (!result) {
        return;
      }

      const task = this.exam.tasks[this.currentGroupView].tasks[index];
      const tag: Tag = {
        _id: result._id,
        name: result.name,
        color: result.color,
        textColor: result.textColor,
      };
      this.tasksWithModifiedTags.push({ taskId: task._id, tagData: tag });

      if (result.exists) {
        console.log('addTagToTask()');
        this.tagHelper.addTagToTask(tag, task);
        return;
      }

      this.tagHelper.createTagAndAddToTask(tag, task);
    });
  }

  private getAbsoluteSubtaskIndex(
    groupIndex: number,
    taskIndex: number,
  ): number {
    // Returns the 0-based position of the task at (groupIndex, taskIndex) in the
    // backend's flat AufgabenTeil array, by counting all real subtasks that appear
    // before it in LaTeX compilation order — mirroring generation.ts skip rules:
    //   • Single-newPage groups are skipped entirely (no \aufgabe emitted).
    //   • newPage and manualText tasks within a group are skipped (no \aufgabenteil).
    let count = 0;
    for (let g = 0; g < groupIndex; g++) {
      const group = this.exam.tasks[g];
      if (group.tasks.length === 1 && group.tasks[0].type === 'newPage') {
        continue;
      }
      for (const task of group.tasks) {
        if (task.type !== 'newPage' && task.type !== 'manualText') count++;
      }
    }
    // Count real subtasks at positions [0, taskIndex) within the target group.
    // taskIndex = 0 → loop never runs → count unchanged → returns 0 for the first task.
    for (let i = 0; i < taskIndex; i++) {
      const task = this.exam.tasks[groupIndex].tasks[i];
      if (task.type !== 'newPage' && task.type !== 'manualText') count++;
    }
    return count;
  }

  /**
   * Returns the page number for the given subtask index in the generated PDF.
   */
  private getPDFPageNumber(
    index: number,
    groupIndex = this.currentGroupView,
  ): number {
    const absoluteIndex = this.getAbsoluteSubtaskIndex(groupIndex, index);
    const info = this.PDFTasksInfo[absoluteIndex];
    if (!info) {
      const subtaskChar = this.calcTaskChar(index, groupIndex);
      throw new Error(
        'Could not find PDF info for task ' +
          (groupIndex + 1) +
          '.' +
          subtaskChar,
      );
    }
    return info.page;
  }

  /* ------ Task Group Tabs ------ */
  onTabChange(index: number) {
    const addTabIndex = this.exam.tasks.length + (this.previewPdfUrl ? 1 : 0);
    if (index === addTabIndex) {
      this.addTab();
    } else if (index >= this.exam.tasks.length) {
      // preview tab selected — keep currentGroupView on last valid group
      this.currentGroupView = this.exam.tasks.length - 1;
    } else {
      this.currentGroupView = index;
    }
  }

  addTab() {
    this.exam.tasks.push({
      groupNumber: this.exam.tasks.length + 1,
      groupTitle: { DE: '', EN: '' },
      tasks: [],
    });
    const newIndex = this.exam.tasks.length - 1;
    // Defer so Angular renders the new mat-tab before [selectedIndex] tries to select it
    setTimeout(() => {
      this.currentGroupView = newIndex;
    });
    this.triggerAutosave();
  }

  deleteTab(i: number) {
    if (this.exam.tasks.length === 1) {
      return;
    }
    this.exam.tasks.splice(i, 1);
    this.currentGroupView--;
    this.triggerAutosave();
  }

  tabLabel(index: number): string {
    const title = stripHTML(this.exam.tasks[index].groupTitle.DE);
    if (title) {
      return truncateString(title, 20);
    } else {
      return 'Assignment ' + (index + 1);
    }
  }

  dropTab(event: CdkDragDrop<string[]>) {
    const prevActive = this.exam.tasks[this.currentGroupView];
    moveItemInArray(this.exam.tasks, event.previousIndex, event.currentIndex);
    this.currentGroupView = this.exam.tasks.indexOf(prevActive);
    this.triggerAutosave();
  }

  public getTaskError(
    groupIndex: number,
    taskIndex: number,
  ): string | undefined {
    return this.taskErrors.find(
      e => e.groupIndex === groupIndex && e.taskIndex === taskIndex,
    )?.message;
  }

  private errorHandler(err: any) {
    const openSnackbar = (text: string) => {
      this.snackbarDismissSub?.unsubscribe();
      this.snackbarDismissSub = this.snackBar
        .open(text, 'OK')
        .afterDismissed()
        .subscribe(() => {
          this.taskErrors = [];
        });
    };

    const scrollToTask = (groupIndex: number, taskIndex: number) => {
      const alreadyOnTab = this.currentGroupView === groupIndex;
      this.currentGroupView = groupIndex;
      const scroll = () =>
        this.taskCards
          .toArray()
          [taskIndex]?.elementRef.nativeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
      if (alreadyOnTab) {
        setTimeout(scroll);
      } else {
        this.tabGroup.animationDone.pipe(take(1)).subscribe(scroll);
      }
    };

    const handle = (err: any) => {
      const body = err.error;
      if (!body?.error) {
        openSnackbar(err.message ?? 'An unknown error occurred.');
        return;
      }

      const parsed = JSON.parse(body.error);

      if (
        parsed.name === 'InvalidPageBreakError' &&
        Array.isArray(parsed.offenses)
      ) {
        const offenses = parsed.offenses as {
          group: number;
          task: number;
          type: string;
          reason?: string;
        }[];
        this.taskErrors = offenses.map(o => ({
          groupIndex: o.group - 1,
          taskIndex: o.task - 1,
          message: o.reason ?? parsed.message,
        }));
        if (offenses.length > 0) {
          scrollToTask(offenses[0].group - 1, offenses[0].task - 1);
        }
        openSnackbar(parsed.message);
        return;
      }

      // LatexCompileError and LatexRenderError both carry a single cause location
      if (parsed.cause && typeof parsed.cause.group === 'number') {
        const cause = parsed.cause as {
          group: number;
          task: number;
          type: string;
        };
        const groupIndex = cause.group - 1;
        const taskIndex = cause.task - 1;
        if (groupIndex >= 0 && taskIndex >= 0) {
          this.taskErrors = [
            { groupIndex, taskIndex, message: parsed.message },
          ];
          scrollToTask(groupIndex, taskIndex);
        }
        openSnackbar(
          `Compilation error in group ${cause.group}, task ${cause.task} (${cause.type}).`,
        );
        return;
      }

      openSnackbar(parsed.message ?? 'An unknown error occurred.');
    };

    try {
      if (err.error instanceof Blob) {
        err.error.text().then((text: string) => {
          handle({ ...err, error: JSON.parse(text) });
        });
      } else {
        handle(err);
      }
    } catch {
      openSnackbar(err.message ?? 'An unknown error occurred.');
    }
  }
}
