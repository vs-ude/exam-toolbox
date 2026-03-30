import { Component, ElementRef, HostListener, ViewChild } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { NgFor, NgIf } from "@angular/common";
import { Exam, Task } from "../../exam";
import { AddTaskComponent } from "./add-task/add-task.component";
import { MatSelectModule } from "@angular/material/select";
import { FormsModule } from "@angular/forms";
import { ApiService } from "../../services/api.service";
import { MatTabsModule } from "@angular/material/tabs";
import { MultiplechoiceTaskComponent } from "./tasks/multipleChoiceTask/multiplechoice-task.component";
import { ShortAnswerTaskComponent } from "./tasks/short-answer-task/short-answer-task.component";
import { MatCardModule } from "@angular/material/card";
import { Router } from "@angular/router";
import { TaskGroupTitleComponent } from "./task-group-title/task-group-title.component";
import { PictureTaskComponent } from "./tasks/picture-task/picture-task.component";
import { Theme, ThemeToggleService } from "../../services/theme-toggle.service";
import { ColorProviderService } from "../../services/color-provider.service";
import { LatexTaskComponent } from "./tasks/latex-task/latex-task.component";
import { TableTaskComponent } from "./tasks/table-task/table-task.component";
import { TaskBuilderService } from "../../services/task-builder.service";
import { ManualTextComponent } from "./tasks/manual-text/manual-text.component";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { MassExamDialogComponent } from "../mass-exam-dialog/mass-exam-dialog.component";
import { LoadingService } from "../../services/loading.service";
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  moveItemInArray,
  CdkDragHandle,
} from "@angular/cdk/drag-drop";
import { NewPageComponent } from "./tasks/new-page/new-page.component";
import { UpdateTaskDialogComponent } from "../update-task-dialog/update-task-dialog.component";
import { HttpResponse } from "@angular/common/http";
import { NewPageDialogComponent } from "./new-page-dialog/new-page-dialog.component";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { Tag } from "../../tag";
import { AddTagDialogComponent, AddTagDialogData } from "../add-tag-dialog/add-tag-dialog.component";
import { TagHelperService } from "../../services/tag-helper.service";
import { DraggablePoolComponent } from "./draggable-pool/draggable-pool.component";
import { Subject, debounceTime, Observable, take, forkJoin, retry } from "rxjs";
import { AutosaveService } from "../../services/autosave.service";
import { ConflictDialogComponent } from "../conflict-dialog/conflict-dialog.component";

interface PDFTaskInfo {
  page: number;
  logFileBoundaryError: boolean;
}

@Component({
  selector: "app-create-exam",
  standalone: true,
  imports: [
    MatIconModule,
    MatTooltipModule,
    AddTaskComponent,
    MultiplechoiceTaskComponent,
    NgFor,
    NgIf,
    MatSelectModule,
    FormsModule,
    MatCardModule,
    MatTabsModule,
    ShortAnswerTaskComponent,
    TaskGroupTitleComponent,
    PictureTaskComponent,
    LatexTaskComponent,
    TableTaskComponent,
    ManualTextComponent,
    CdkDrag,
    CdkDropList,
    CdkDragHandle,
    NewPageComponent,
    MatSnackBarModule,
    DraggablePoolComponent,
  ],
  templateUrl: "./create-exam.component.html",
  styleUrl: "./create-exam.component.scss",
})
export class CreateExamComponent {
  public inDropzone = false;
  public isNameChange = false;
  public isUpdateMode = false;

  private bodyElement: HTMLElement = document.body;
  public semesters = ["WS 23/24", "SS 24", "WS 24/25", "SS 25"];
  private modifiedPoolTasks: Set<string> = new Set<string>();
  private newTasksToCreate: Set<string> = new Set<string>();
  private tasksWithModifiedTags: {
    taskId: string;
    tagData: Tag;
  }[] = [];

  public taskPool: Task[] = [];
  public refreshPool$: Subject<void> = new Subject<void>();
  public totalPoints = 0;
  public bilingual = false;
  public exam = new Exam("New Exam", "", "", "", 90, [
    { groupNumber: 1, groupTitle: { DE: "", EN: "" }, tasks: [] },
  ]);

  public currentGroupView = 0;
  public lightTheme: boolean = true;

  public previewPdfUrl: SafeResourceUrl | null = null;

  public isPreviewTabActive = false;
  public previewTabNotification = false;
  private PDFTasksInfo: PDFTaskInfo[] = [];

  private autosaveTrigger$ = new Subject<void>();
  private previewReady$ = new Subject<void>();

  constructor(
    private api: ApiService,
    private router: Router,
    private themeService: ThemeToggleService,
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
        this.exam._id && this.exam._id !== "new" ? this.exam._id : undefined;
      this.autosaveService.saveLocal(idToSave, this.exam);
    });

    this.importExam();
    this.importPoolTasks();
    this.semesters = this.getSemesters();
    if (!this.exam.semester) {
      this.exam.semester = this.semesters[0];
    }

    this.themeService.themeChanged$.subscribe((theme: Theme) => {
      this.lightTheme = theme === Theme.LIGHT ? true : false;
    });
  }

  @ViewChild("nameInput") nameInput?: ElementRef;

  private triggerAutosave() {
    this.autosaveTrigger$.next();
  }

  @HostListener("document:click", ["$event"])
  unselectInputs(event: MouseEvent) {
    const elementId = (event.target as Element).id;

    if (elementId === "examName") {
      return;
    }
    this.isNameChange = false;
    if (!this.nameInput) {
      return;
    }
    const newName = this.nameInput.nativeElement.value;
    if (newName === "") {
      return;
    }
    this.exam.courseName = newName;
    if (this.exam.courseName !== newName) this.triggerAutosave();
  }

  onNameChange(event: any) {
    if (event.key !== "Enter") {
      return;
    }
    const newName = event.target.value;
    if (newName !== "") {
      this.exam.courseName = event.target.value;
      this.triggerAutosave();
    }
    this.isNameChange = false;
  }

  dragStart(event: DragEvent) {
    this.bodyElement.classList.add("inheritCursors");
    this.bodyElement.style.cursor = "grabbing";
  }

  drop(event: DragEvent) {
    this.bodyElement.classList.remove("inheritCursors");
    this.bodyElement.style.cursor = "unset";
    const element = event.target as Element;
    console.log(element.id);

    if (this.inDropzone) {
      if (element.id.slice(0, 4) === "new_") {
        this.pushNewTask(element.id);
      } else {
        this.pushPoolTask(element.id);
      }
      this.triggerAutosave();
    }
    this.inDropzone = false;
  }

  reorderDrop(event: CdkDragDrop<Task[]>) {
    moveItemInArray(
      this.exam.tasks[this.currentGroupView].tasks,
      event.previousIndex,
      event.currentIndex,
    );
    this.triggerAutosave();
  }

  private pushNewTask(taskType: string) {
    let task = this.taskBuilder.createTask(taskType);
    task.usedIn = [this.exam._id || "placeholder_id"];
    this.exam.tasks[this.currentGroupView].tasks.push(task);
    this.adjustTotalPoints();
  }

  private pushPoolTask(taskId: string) {
    const task = this.taskPool.find((element) => element.taskId === taskId);
    if (task == undefined) {
      console.warn("couldn't find task");
      return;
    }

    // update Task Metadata
    if (!task.usedIn.includes(this.exam._id || "placeholder_id")) {
      task.usedIn.push(this.exam._id || "placeholder_id");
    }
    task.lastUsed = new Date();

    this.exam.tasks[this.currentGroupView].tasks.push(task);
    this.adjustTotalPoints();
  }

  dragOverDropzone(event: DragEvent) {
    event.preventDefault();
    this.inDropzone = true;
  }

  deleteTask(index: number) {
    this.exam.tasks[this.currentGroupView].tasks.splice(index, 1);
    this.adjustTotalPoints();
    this.triggerAutosave();
  }

  onSave() {
    this.checkIfValid();
    this.addNewTasksToPool();
    this.uploadExam();
  }


  private addNewTasksToPool() {
    for (let i = 0; i < this.exam.tasks.length; i++) {
      for (let j = 0; j < this.exam.tasks[i].tasks.length; j++) {
        const currentTaskId = this.exam.tasks[i].tasks[j].taskId;
        if (
          this.taskPool.find((task) => task.taskId === currentTaskId) ==
          undefined
        ) {
          if (this.exam.tasks[i].tasks[j].type === "newPage") {
            continue;
          }
          this.api.addTaskToPool(this.exam.tasks[i].tasks[j]).subscribe(
            (response) => {
              console.log(`Task ${currentTaskId} added to pool`, response);
            },
            (error) => {
              console.error("Error adding task: ", error);
            },
          );
        }
      }
    }
  }

  private uploadExam() {
    this.api.addExam(this.exam).subscribe(
      (response) => {
        console.log("Exam added successfully: ", response);
        this.autosaveService.clearLocal(undefined);
        this.router.navigate([`/create-exam/${response.insertedId}`]); // uses the id inserted by mongodb to navigate to a detailed view of this exam
      },
      (error) => {
        console.error("Error adding exam: ", error);
      },
    );
  }

  onPreview() {
    this.checkIfValid();
    this.loadingService.loadingOn();
    const exam = this.api.generateExam(this.exam);
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
          this.snackBar.open("Preview has been updated!", "Dismiss", {
            duration: 3000,
          });
        }

        const subtaskHeader = response.headers.get("X-Subtask-Info");
        const subtaskInfo: PDFTaskInfo[] = subtaskHeader ? JSON.parse(subtaskHeader) : [];
        this.PDFTasksInfo = subtaskInfo;
        console.log("Subtask Info from header:", subtaskInfo);

        const errorIndex = subtaskInfo.findIndex((info) => info.logFileBoundaryError);
        if (errorIndex !== -1) {
          console.warn(
            "Log file boundary errors detected, inserting new pages accordingly.",
          );
          this.insertNewPage(errorIndex);
        }

        this.loadingService.loadingOff();
        this.previewReady$.next();
      },
      error: (err) => {
        console.error("Error generating exam preview: ", err);
        this.loadingService.loadingOff();
        alert("An error occurred while generating the exam preview");
      },
    });
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
      if (group.tasks.length === 1 && group.tasks[0].type === "newPage") continue;
      for (let i = 0; i < group.tasks.length; i++) {
        const task = group.tasks[i];
        if (task.type === "newPage" || task.type === "manualText") continue;
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
    result.subscribe((auto) => {
      if (!auto) {
        return;
      }
      const newPageElement = this.taskBuilder.createTask("new_newPage");
      this.exam.tasks[assignmentIndex].tasks.splice(taskIndex, 0, newPageElement);
      this.triggerAutosave();
    });
  }

  private askForNewPageAutoInsert(task: Task, taskNumber: string) {
    const dialogRef = this.dialog.open(NewPageDialogComponent, {
      width: "30%",
      height: "30%",
      data: { taskNumber: taskNumber, task: task },
    });
    return dialogRef.afterClosed();
  }

  private checkIfValid() {
    if (this.exam.courseName === "") {
      alert("Please enter a name for the exam");
      throw new Error("no exam name");
    }

    if (this.exam.semester === "") {
      alert("Please select a semester");
      throw new Error("No semester selected");
    }

    if (this.exam.examinerName === "") {
      alert("Please enter the examiner's name");
      throw new Error("No examiner name");
    }

    if (this.exam.date === "") {
      alert("Please enter the exam date");
      throw new Error("no exam date set");
    }
  }

  private adjustTotalPoints() {
    this.totalPoints = this.exam.tasks
      .map((taskGroup) => taskGroup.tasks.flat())
      .flat()
      .reduce((accumulator: number, task) => (accumulator += task.points), 0);
  }

  onTaskChange(task: Task, index: number) {
    this.exam.tasks[this.currentGroupView].tasks[index] = task;
    this.adjustTotalPoints();
    this.trackChangeInPoolTasks(task.taskId);
    console.log(task);
    this.triggerAutosave();
  }

  private trackChangeInPoolTasks(taskId: string) {
    if (this.isPoolTask(taskId)) {
      this.modifiedPoolTasks.add(taskId);
    }
  }

  public isPoolTask(taskId: string): boolean {
    return (
      this.taskPool.find((poolTask) => poolTask.taskId === taskId) != undefined
    );
  }

  public isModifiedPoolTask(taskId: string): boolean {
    if (!this.isPoolTask(taskId)) {
      return false;
    }
    return this.modifiedPoolTasks.has(taskId);
  }

  public onCreateNewTaskChange(newTask: boolean, index: number) {
    const taskId = this.exam.tasks[this.currentGroupView].tasks[index].taskId;
    if (newTask) {
      this.newTasksToCreate.add(taskId);
      return;
    }
    this.newTasksToCreate.delete(taskId);
  }

  onTitleChange(taskGroupTitle: { DE: string; EN: string }) {
    this.exam.tasks[this.currentGroupView].groupTitle = taskGroupTitle;
    this.triggerAutosave();
  }

  onUpdate() {
    this.checkIfValid();
    this.addNewTasksToPool();
    this.updatePoolTasks();
    this.importPoolTasks();
    this.api.updateExam(this.exam._id, this.exam).subscribe(
      (response) => {
        console.log("Exam updated successfully: ", response);
        this.autosaveService.clearLocal(this.exam._id);
      },
      (error) => {
        console.error("Error updating exam: ", error);
      },
    );
  }

  private updatePoolTasks() {
    if (this.modifiedPoolTasks.size === 0) {
      return;
    }

    const modifiedIndices: [number, number][] = [];
    for (let i = 0; i < this.exam.tasks.length; i++) {
      for (let j = 0; j < this.exam.tasks[i].tasks.length; j++) {
        const task = this.exam.tasks[i].tasks[j];
        const isPoolTask =
          this.taskPool.find((poolTask) => poolTask.taskId === task.taskId) !=
          undefined;
        const isModified = this.modifiedPoolTasks.has(task.taskId);

        if (!isPoolTask || !isModified) continue;

        modifiedIndices.push([i, j]);
      }
    }

    this.askUserForTaskUpdate(modifiedIndices);
  }

  private askUserForTaskUpdate(modifiedIndices: [number, number][]) {
    const tasks = [];
    for (const [i, j] of modifiedIndices) {
      const task = this.exam.tasks[i].tasks[j];
      tasks.push({
        assignmentNumber: `${i + 1}.${this.mapTaskIndexToChar(j)}`,
        task: task,
        newTask: this.newTasksToCreate.has(task.taskId),
      });
    }

    const dialogRef = this.dialog.open(UpdateTaskDialogComponent, {
      width: "50%",
      height: "50%",
      data: tasks,
    });

    dialogRef.afterClosed().subscribe((results: string) => {
      if (!results) {
        return;
      }
      for (let index = 0; index < results.length; index++) {
        results[index]
          ? this.createNewTask(modifiedIndices[index])
          : this.updateTask(modifiedIndices[index]);
      }
      this.modifiedPoolTasks.clear();
      this.newTasksToCreate.clear();
    });
  }

  updateTask(index: [number, number]) {
    const [i, j] = index;
    const task = this.exam.tasks[i].tasks[j];
    this.api.updateTaskInPool(task.taskId, task).subscribe(
      (response) => {
        console.log(`Task ${task.taskId} updated in pool`, response);
        this.importPoolTasks(); // refresh pool tasks after updating task
      },
      (error) => {
        console.error(`Error updating task ${task.taskId}: `, error);
      },
    );
  }

  createNewTask(index: [number, number]) {
    const [i, j] = index;
    const oldTask = this.exam.tasks[i].tasks[j];
    const newTask: Task = JSON.parse(JSON.stringify(oldTask));
    newTask.parent = oldTask.taskId;
    newTask.children = [];
    newTask.taskId = oldTask.type + "-" + Date.now();
    oldTask.children.push(newTask.taskId);

    // add new Task as child for the old Task
    this.api.addChildToTaskPoolTask(oldTask.taskId, newTask.taskId).subscribe(
      (response) => {
        console.log("new child was added to the old Task");
      },
      (error) => {
        console.error("Error adding the child to the old Task", error);
      },
    );

    this.exam.tasks[i].tasks[j] = newTask;

    // add new task to pool
    this.api.addTaskToPool(newTask).subscribe(
      (response) => {
        console.log(`New Task ${newTask.taskId} added to pool`, response);
        this.importPoolTasks(); // refresh pool tasks after adding new task
      },
      (error) => {
        console.error(`Error adding new task ${newTask.taskId}: `, error);
      },
    );

    // update Exam that now includes the new Task
    this.api.updateExam(this.exam._id, this.exam).subscribe(
      (response) => {
        console.log("Exam with new Task updated successfully: ", response);
      },
      (error) => {
        console.error("Error updating exam: ", error);
      },
    );
    this.triggerAutosave();
  }


  private importExam() {
    const lastURLPart = this.router.url.split("/").pop();

    if (lastURLPart === "create-exam" || lastURLPart == undefined) {
      this.isUpdateMode = false;

      const draft = this.autosaveService.loadLocal(undefined);

      if (draft) {
        const dialogRef = this.dialog.open(ConflictDialogComponent, {
          width: "600px",
          disableClose: true,
          data: {
            dbExam: new Exam("New Exam", "", "", "", 90, []),
            localWrapper: draft,
            isNewExam: true,
          },
        });

        dialogRef.afterClosed().subscribe((resume: boolean) => {
          if (resume) {
            this.exam = draft.data;
            this.adjustTotalPoints();
            this.snackBar.open("Resumed unsaved new exam.", "OK", {
              duration: 3000,
            });
          } else {
            this.autosaveService.clearLocal(undefined);
          }
        });
      }
      return;
    }

    this.exam._id = lastURLPart;
    this.isUpdateMode = true;

    this.api.getExam(lastURLPart).subscribe(
      (dbExam) => {
        const localWrapper = this.autosaveService.loadLocal(dbExam._id);
        const dbTime = (dbExam as any).updatedAt
          ? new Date((dbExam as any).updatedAt).getTime()
          : 0;

        if (localWrapper && localWrapper.timestamp > dbTime) {
          const dialogRef = this.dialog.open(ConflictDialogComponent, {
            width: "600px",
            disableClose: true,
            data: { dbExam: dbExam, localWrapper: localWrapper },
          });

          dialogRef.afterClosed().subscribe((useLocal: boolean) => {
            if (useLocal) {
              this.exam = localWrapper.data;
              this.exam._id = dbExam._id;
              this.adjustTotalPoints();
              this.snackBar.open("Unsaved changes restored.", "OK", {
                duration: 3000,
              });
            } else {
              this.initializeExamData(dbExam);
              this.autosaveService.clearLocal(dbExam._id);
              this.snackBar.open("Discarded local draft.", "OK", {
                duration: 3000,
              });
            }
          });
        } else {
          if (localWrapper) this.autosaveService.clearLocal(dbExam._id);
          this.initializeExamData(dbExam);
        }
      },
      (error) => console.error(error),
    );
  }

  private initializeExamData(response: Exam) {
    this.exam = response;
    for (let taskGroup  of this.exam.tasks) {
      for (let task of taskGroup.tasks) {
        this.tagHelper.importTagsToTask(task)
        console.log("importing tags for task", task)
      }
    }
    this.adjustTotalPoints();
  }

  private importPoolTasks() {
    forkJoin({
      tasks: this.api.getTasksFromPool(),
      tags: this.api.getAllTags()
    }).subscribe({
      next: ({ tasks, tags }) => {
        this.taskPool = tasks.map(task => ({
          ...task,
          tags: tags.filter(tag => task.tagIds.includes(tag._id!))
        }));
        this.refreshPool$.next();
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  public addTab() {
    this.exam.tasks.push({
      groupNumber: this.exam.tasks.length + 1,
      groupTitle: { DE: "", EN: "" },
      tasks: [],
    });
    this.currentGroupView = this.exam.tasks.length - 1;
  }

  public deleteTab() {
    if (this.exam.tasks.length === 1) {
      return;
    }
    this.exam.tasks.splice(this.currentGroupView, 1);
    this.currentGroupView--;
  }

  public changeTab(index: number) {
    this.currentGroupView = index;
    if (index < this.exam.tasks.length) {
      this.isPreviewTabActive = false;
    } else {
      this.isPreviewTabActive = true;
      this.previewTabNotification = false;
    }
  }

  public calcTaskChar(
    index: number,
    groupIndex = this.currentGroupView,
  ): string {
    // ignore manual text and new page tasks when calculating the task number
    let ignoredCount = 0;
    const tasks = this.exam.tasks[groupIndex].tasks;
    for (let i = 0; i < index; i++) {
      if (tasks[i].type === "manualText" || tasks[i].type === "newPage")
        ignoredCount++;
    }

    return this.mapTaskIndexToChar(index - ignoredCount);
  }

  private mapTaskIndexToChar(index: number) {
    return String.fromCharCode(97 + (index % 26));
  }

  onMassExam() {
    this.checkIfValid();

    this.dialog.open(MassExamDialogComponent, {
      width: "50%",
      height: "60%",
      data: { exam: this.exam },
    });
  }

  private getSemesters() {
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1; // getMonth() returns 0-11, so we add 1
    const year = currentDate.getFullYear();

    let formatYear = (year: number): string => {
      return year.toString().slice(-2);
    };

    if (month >= 10 || month <= 3) {
      return [
        `WS ${formatYear(year)}/${formatYear(year + 1)}`,
        `SS ${formatYear(year + 1)}`,
        `WS ${formatYear(year + 1)}/${formatYear(year + 2)}`,
      ];
    } else {
      return [
        `SS ${formatYear(year)}`,
        `WS ${formatYear(year)}/${formatYear(year + 1)}`,
        `SS ${formatYear(year + 1)}`,
      ];
    }
  }

  public onAddTag(index: number) {
    console.log("add tag for task with index ", index);
    const dialogRef: MatDialogRef<AddTagDialogComponent, AddTagDialogData>  = this.dialog.open(AddTagDialogComponent, {
      width: "50%",
      height: "50%",
      data: {},
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }

      const task = this.exam.tasks[this.currentGroupView].tasks[index];
      const tag: Tag = {
        _id: result._id,
        name: result.name,
        color: result.color,
        textColor: result.textColor,
      }
      this.tasksWithModifiedTags.push({taskId: task.taskId, tagData: tag});
      
      if (result.exists) {
        console.log("addTagToTask()")
        this.tagHelper.addTagToTask(tag, task);
        return;
      }

      this.tagHelper.createTagAndAddToTask(tag, task);
    });
  }

  public onTaskPreview(index: number) {
    this.onPreview();
    this.previewReady$.pipe(take(1)).subscribe({
      next: () => {
        const pageNumber = this.getPDFPageNumber(index, this.currentGroupView);

        // Update the PDF URL to jump to the specific page
        const baseUrl = this.sanitizer.sanitize(4, this.previewPdfUrl) as string;
        const pageUrl = baseUrl + '#page=' + pageNumber;
        this.previewPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pageUrl);

        this.changeTab(this.exam.tasks.length); // switch to preview tab
      },
      error: () => {
        console.error("Failed to generate preview");
      },
    });
  }

  private getAbsoluteSubtaskIndex(groupIndex: number, taskIndex: number): number {
    // Returns the 0-based position of the task at (groupIndex, taskIndex) in the
    // backend's flat AufgabenTeil array, by counting all real subtasks that appear
    // before it in LaTeX compilation order — mirroring generation.ts skip rules:
    //   • Single-newPage groups are skipped entirely (no \aufgabe emitted).
    //   • newPage and manualText tasks within a group are skipped (no \aufgabenteil).
    let count = 0;
    for (let g = 0; g < groupIndex; g++) {
      const group = this.exam.tasks[g];
      if (group.tasks.length === 1 && group.tasks[0].type === "newPage") continue;
      for (const task of group.tasks) {
        if (task.type !== "newPage" && task.type !== "manualText") count++;
      }
    }
    // Count real subtasks at positions [0, taskIndex) within the target group.
    // taskIndex = 0 → loop never runs → count unchanged → returns 0 for the first task.
    for (let i = 0; i < taskIndex; i++) {
      const task = this.exam.tasks[groupIndex].tasks[i];
      if (task.type !== "newPage" && task.type !== "manualText") count++;
    }
    return count;
  }

  private getPDFPageNumber(index: number, groupIndex = this.currentGroupView): number {
    const absoluteIndex = this.getAbsoluteSubtaskIndex(groupIndex, index);
    const info = this.PDFTasksInfo[absoluteIndex];
    if (!info) {
      const subtaskChar = this.calcTaskChar(index, groupIndex);
      throw new Error(
        "Could not find PDF info for task " + (groupIndex + 1) + "." + subtaskChar,
      );
    }
    return info.page;
  }
}
