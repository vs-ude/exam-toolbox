import { Component, ElementRef, HostListener, viewChild, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgFor, NgIf, NgStyle } from '@angular/common';
import { Exam, Task } from '../../exam';
import { AddTaskComponent } from './add-task/add-task.component';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule, } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { saveAs } from 'file-saver';
import { MatTabsModule } from '@angular/material/tabs';
import { MultiplechoiceTaskComponent } from './tasks/multipleChoiceTask/multiplechoice-task.component';
import { ShortAnswerTaskComponent } from "./tasks/short-answer-task/short-answer-task.component";
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { TaskGroupTitleComponent } from "./task-group-title/task-group-title.component";
import { PictureTaskComponent } from "./tasks/picture-task/picture-task.component";
import { Theme, ThemeToggleService } from '../../services/theme-toggle.service';
import { ColorProviderService } from '../../services/color-provider.service';
import { LatexTaskComponent } from './tasks/latex-task/latex-task.component';
import { TableTaskComponent } from './tasks/table-task/table-task.component';
import { TaskBuilderService } from '../../services/task-builder.service';
import { ManualTextComponent } from './tasks/manual-text/manual-text.component';
import { MatDialog } from '@angular/material/dialog';
import { MassExamDialogComponent } from '../mass-exam-dialog/mass-exam-dialog.component';
import { LoadingService } from '../../services/loading.service';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray, CdkDragHandle } from '@angular/cdk/drag-drop';
import { NewPageComponent } from "./tasks/new-page/new-page.component";
import { UpdateTaskDialogComponent } from '../update-task-dialog/update-task-dialog.component';
import { HttpResponse } from '@angular/common/http';





@Component({
  selector: 'app-create-exam',
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
    NewPageComponent
  ],
  templateUrl: './create-exam.component.html',
  styleUrl: './create-exam.component.scss'
})
export class CreateExamComponent {

  public inDropzone = false;
  public isNameChange = false
  public isUpdateMode = false

  private bodyElement: HTMLElement = document.body;
  public semesters = ["WS 23/24", "SS 24", "WS 24/25", "SS 25"];
  private modifiedPoolTasks: Set<string> = new Set<string>();

  public taskPool: Task[] = [];
  public totalPoints = 0;
  public bilingual = false;
  public exam = new Exam("New Exam", "", "", "", 90, [{ groupNumber: 1, groupTitle: { DE: "", EN: "" }, tasks: [] }]);

  public currentGroupView = 0;
  public lightTheme: boolean = true;


  constructor(
    private api: ApiService,
    private router: Router,
    private themeService: ThemeToggleService,
    public colorProvider: ColorProviderService,
    private taskBuilder: TaskBuilderService,
    private dialog: MatDialog,
    private loadingService: LoadingService,
  ) {
    this.importExam();
    this.importPoolTasks();
    this.semesters = this.getSemesters();

    this.themeService.themeChanged$.subscribe((theme: Theme) => {
      this.lightTheme = theme === Theme.LIGHT ? true : false;
    })

  }

  @ViewChild("nameInput") nameInput?: ElementRef;

  @HostListener("document:click", ["$event"])
  unselectInputs(event: MouseEvent) {
    const elementId = (event.target as Element).id;

    if (elementId === "examName") {
      return;
    }
    this.isNameChange = false;
    if (!this.nameInput) { return; }
    const newName = this.nameInput.nativeElement.value;
    if (newName === "") { return }
    this.exam.courseName = newName;
  }

  onNameChange(event: any) {
    if (event.key !== "Enter") { return }
    const newName = event.target.value;
    if (newName !== "") {
      this.exam.courseName = event.target.value;
    };
    this.isNameChange = false;
  }

  dragStart(event: DragEvent) {
    this.bodyElement.classList.add("inheritCursors");
    this.bodyElement.style.cursor = "grabbing";
  }

  drop(event: DragEvent) {
    this.bodyElement.classList.remove("inheritCursors");
    this.bodyElement.style.cursor = "unset"
    const element = event.target as Element;
    console.log(element.id);

    if (this.inDropzone) {
      if (element.id.slice(0, 4) === "new_") {
        this.pushNewTask(element.id);
      } else {
        this.pushPoolTask(element.id);
      }
    }
    this.inDropzone = false;
  }

  reorderDrop(event: CdkDragDrop<Task[]>) {
    moveItemInArray(this.exam.tasks[this.currentGroupView].tasks, event.previousIndex, event.currentIndex);
  }

  private pushNewTask(taskType: string) {
    let task = this.taskBuilder.createTask(taskType)
    task.usedIn = [this.exam._id || "placeholder_id"];
    this.exam.tasks[this.currentGroupView].tasks.push(task)
    this.adjustTotalPoints();
  }

  private pushPoolTask(taskId: string) {
    const task = this.taskPool.find(element => element.taskId === taskId);
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
        if (this.taskPool.find(task => task.taskId === currentTaskId) == undefined) {
          if (this.exam.tasks[i].tasks[j].type === "newPage") { continue; }
          this.api.addTaskToPool(this.exam.tasks[i].tasks[j]).subscribe(
            response => {
              console.log(`Task ${currentTaskId} added to pool`, response);
            },
            error => {
              console.error('Error adding task: ', error);
            }
          )
        }
      }
    }
  }

  private uploadExam() {
    this.api.addExam(this.exam).subscribe(
      response => {
        console.log('Exam added successfully: ', response);
        this.router.navigate([`/create-exam/${response.insertedId}`]) // uses the id inserted by mongodb to navigate to a detailed view of this exam
      },
      error => {
        console.error('Error adding exam: ', error);
      }
    );
  }

  onPreview() {
    this.checkIfValid()
    // console.log(this.exam)

    this.loadingService.loadingOn();
    this.api.generateExam(this.exam).subscribe({
      next: (response: HttpResponse<Blob>) => {
        const pdfBlob = response.body
        if(pdfBlob){
          saveAs(pdfBlob, `${this.exam.courseName}.pdf`)
        }

        const subtaskHeader = response.headers.get('X-Subtask-Info')
        const subtaskInfo = subtaskHeader ? JSON.parse(subtaskHeader) : []
        console.log("Subtask Info from header:", subtaskInfo)
        
        const hasErrors = subtaskInfo.some((info: any) => info.logFileBoundaryError === true)
        if (hasErrors) {
          alert("Warning: A layout error was detected in the Logfile! Check the browser-console for details.")
        }

        this.loadingService.loadingOff()
      },
      error: (err) => {
        console.error('Error generating exam preview: ', err)
        this.loadingService.loadingOff()
      }
    })
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
      throw new Error("no exam date set")
    }
  }

  private adjustTotalPoints() {
    this.totalPoints = this.exam.tasks
      .map(taskGroup => taskGroup.tasks.flat())
      .flat()
      .reduce(
        (accumulator: number, task) => accumulator += task.points, 0
      );
  }

  onTaskChange(task: Task, index: number) {
    this.exam.tasks[this.currentGroupView].tasks[index] = task;
    this.adjustTotalPoints();
    this.trackChangeInPoolTasks(task.taskId);
    console.log(task)
  }

  private trackChangeInPoolTasks(taskId: string) {
    if (this.taskPool.find(poolTask => poolTask.taskId === taskId) != undefined) {
      this.modifiedPoolTasks.add(taskId);
    }
  }

  onTitleChange(taskGroupTitle: { DE: string, EN: string }) {
    this.exam.tasks[this.currentGroupView].groupTitle = taskGroupTitle;
  }

  onUpdate() {
    this.checkIfValid()
    this.addNewTasksToPool();
    this.updatePoolTasks();
    this.api.updateExam(this.exam._id, this.exam).subscribe(
      response => {
        console.log('Exam updated successfully: ', response);
      },
      error => {
        console.error('Error updating exam: ', error);
      }
    )
  }

  private updatePoolTasks() {
    for (let i = 0; i < this.exam.tasks.length; i++) {
      for (let j = 0; j < this.exam.tasks[i].tasks.length; j++) {
        const task = this.exam.tasks[i].tasks[j];
        const isPoolTask = this.taskPool.find(poolTask => poolTask.taskId === task.taskId) != undefined;
        const isModified = this.modifiedPoolTasks.has(task.taskId);

        if (!isPoolTask || !isModified) continue;

        const dialogRef = this.dialog.open(UpdateTaskDialogComponent, {
          width: '50%',
          height: '50%',
          data: { assignmentNumber: `${i + 1}.${this.mapTaskIndexToChar(j)}`, task: task }
        });

        dialogRef.afterClosed().subscribe(status => {
          if (status === "update") {
            this.api.updateTaskInPool(task.taskId, task).subscribe(
              response => {
                console.log(`Task ${task.taskId} updated in pool`, response);
              },
              error => {
                console.error(`Error updating task ${task.taskId}: `, error);
              }
            );
          } else {
            const newTask = JSON.parse(JSON.stringify(task));
            newTask.parent = task.taskId;
            newTask.children = [];
            newTask.taskId = task.type + "-" + Date.now();
            task.children.push(newTask.taskId);

            // update old task in pool
            this.api.updateTaskInPool(task.taskId, task).subscribe( 
              response => {
                console.log(`Task ${task.taskId} updated successfully`, response)
              },
              error => {
                console.log(`Error updating Task ${task.taskId}`, error)
              }
            )

            this.exam.tasks[i].tasks[j] = newTask;

            // add new task to pool
            this.api.addTaskToPool(newTask).subscribe(
              response => {
                console.log(`New Task ${newTask.taskId} added to pool`, response);
              },
              error => {
                console.error(`Error adding new task ${newTask.taskId}: `, error);
              }
            );

            // update Exam that now includes the new Task
            this.api.updateExam(this.exam._id, this.exam).subscribe(
              response => {
                console.log('Exam with new Task updated successfully: ', response);
              },
              error => {
                console.error('Error updating exam: ', error);
              }
            );
          }
        });

        this.modifiedPoolTasks.delete(task.taskId);
      }
    }
  }

  private importExam() {
    const lastURLPart = this.router.url.split("/").pop();
    if (lastURLPart === "create-exam" || lastURLPart == undefined) {
      this.isUpdateMode = false
      return;
    }
    this.exam._id = lastURLPart
    this.isUpdateMode = true
    this.api.getExam(lastURLPart).subscribe(
      response => {
        this.exam = response;
        this.adjustTotalPoints();
      },
      error => {
        console.error(error);
      }
    );
  }

  private importPoolTasks() {
    this.api.getTasksFromPool().subscribe(
      response => {
        this.taskPool = response;
      },
      error => {
        console.error(error);
      })
  }

  public addTab() {
    this.exam.tasks.push({ groupNumber: this.exam.tasks.length + 1, groupTitle: { DE: "", EN: "" }, tasks: [] });
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
  }

  public calcTaskChar(index: number): string {
    // ignore manual text and new page tasks when calculating the task number
    let ignoredCount = 0;
    const tasks = this.exam.tasks[this.currentGroupView].tasks;
    for (let i = 0; i < index; i++) {
      if (tasks[i].type === 'manualText' || tasks[i].type === 'newPage') ignoredCount++;
    }

    return this.mapTaskIndexToChar(index - ignoredCount);
  }

  private mapTaskIndexToChar(index: number) {
    return String.fromCharCode(97 + index % 26);
  }

  onMassExam() {
    this.checkIfValid()

    this.dialog.open(MassExamDialogComponent, {
      width: '50%',
      height: '60%',
      data: { exam: this.exam }
    })
  }

  private getSemesters() {
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1; // getMonth() returns 0-11, so we add 1
    const year = currentDate.getFullYear();

    let formatYear = (year: number): string => {
      return year.toString().slice(-2);
    }

    if (month >= 10 || month <= 3) {
      return [
        `WS ${formatYear(year)}/${formatYear(year + 1)}`,
        `SS ${formatYear(year + 1)}`,
        `WS ${formatYear(year + 1)}/${formatYear(year + 2)}`
      ];
    } else {
      return [
        `SS ${formatYear(year)}`,
        `WS ${formatYear(year)}/${formatYear(year + 1)}`,
        `SS ${formatYear(year + 1)}`
      ];
    }
  }



}


