import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Task } from '../../types/shared/tasks';
import { NewPageDialogComponent } from './new-page-dialog/new-page-dialog.component';
import type { EditExamComponent } from './edit-exam.component';

export function reorderDrop(
  this: EditExamComponent,
  event: CdkDragDrop<Task[]>,
): void {
  if (event.previousContainer === event.container) {
    // internal reorder within the task list
    if (
      this.exam.tasks[this.currentGroupView].tasks[event.previousIndex]?.type ==
        'newPage' &&
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
      { source: 'new'; taskType: string } | { source: 'pool'; taskId: string };
    if (data.source === 'new') {
      pushNewTask.call(this, data.taskType, event.currentIndex);
    } else {
      pushPoolTask.call(this, data.taskId, event.currentIndex);
    }
  }
  this.triggerAutosave();
  this.previewTabNotification = false;
  this.taskErrors = [];
}

export function validatePageBreaks(
  this: EditExamComponent,
  insertIndex: number,
  sourceIndex?: number,
): boolean {
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

function pushNewTask(
  this: EditExamComponent,
  taskType: string,
  index?: number,
): void {
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

function pushPoolTask(
  this: EditExamComponent,
  taskId: string,
  index?: number,
): void {
  const task = this.taskPool.find(element => element._id === taskId);
  if (task == undefined) {
    console.warn("couldn't find task");
    return;
  }

  // Check if the task is already present in any group
  let found = 0;
  let idx = 0;
  this.exam.tasks.forEach(group => {
    idx++;
    if (group.tasks.some(t => t._id === task._id)) {
      found = idx;
    }
  });
  if (found) {
    this.snackBar.open(
      `This task is already present in assignment ${found}`,
      'OK',
      {
        duration: 4000,
      },
    );
    return;
  }

  // update Task Metadata
  if (!task.usedIn.includes(this.exam._id || 'placeholder_id')) {
    task.usedIn.push(this.exam._id || 'placeholder_id');
  }
  task.lastUsed = new Date();

  // create new instance of the task to avoid modifying the pool task when editing the task in the exam
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

export function insertNewPage(
  this: EditExamComponent,
  absoluteIndex: number,
): void {
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
  const result = askForNewPageAutoInsert.call(
    this,
    this.exam.tasks[assignmentIndex].tasks[taskIndex],
    `${assignmentIndex + 1}.${subtaskChar}`,
  );
  result.subscribe(auto => {
    if (!auto) {
      return;
    }
    const newPageElement = this.taskBuilder.createTask('new_newPage');
    this.exam.tasks[assignmentIndex].tasks.splice(taskIndex, 0, newPageElement);
    this.triggerAutosave();
    this.previewTabNotification = false;
  });
}

function askForNewPageAutoInsert(
  this: EditExamComponent,
  task: Task,
  taskNumber: string,
) {
  const dialogRef = this.dialog.open(NewPageDialogComponent, {
    width: '30%',
    height: '30%',
    data: { taskNumber: taskNumber, task: task },
  });
  return dialogRef.afterClosed();
}
