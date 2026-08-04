import { MatDialogRef } from '@angular/material/dialog';
import { removePlaceholderIds } from '../../services/exam.service';
import { parseExam } from '../../types/shared/exam';
import { Task } from '../../types/shared/tasks';
import { Tag } from '../../types/shared/tag';
import {
  AddTagDialogComponent,
  AddTagDialogData,
} from '../add-tag-dialog/add-tag-dialog.component';
import { UpdateTaskDialogComponent } from '../update-task-dialog/update-task-dialog.component';
import type { EditExamComponent } from './edit-exam.component';

export function onUpdate(this: EditExamComponent): void {
  this.checkIfValid();
  if (this.modifiedPoolTasks.size === 0) {
    submitUpdateExam.call(this);
    return;
  }
  const modifiedIndices = getModifiedIndices.call(this);
  askUserForTaskUpdate.call(this, modifiedIndices);
}

function getModifiedIndices(this: EditExamComponent): [number, number][] {
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

function askUserForTaskUpdate(
  this: EditExamComponent,
  modifiedIndices: [number, number][],
): void {
  const tasks = modifiedIndices.map(([i, j]) => {
    const task = this.exam.tasks[i].tasks[j];
    return {
      assignmentNumber: this.calcTaskChar(j, i),
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
        prepareNewTask.call(this, modifiedIndices[index]);
      }
      // false = overwrite: task keeps its _id, backend will update it in-place
    }
    submitUpdateExam.call(this);
  });
}

/** Detaches a task from its pool entry so the backend creates a new one. */
function prepareNewTask(
  this: EditExamComponent,
  index: [number, number],
): void {
  const [i, j] = index;
  const oldTask = this.exam.tasks[i].tasks[j];
  const newTask: Task = JSON.parse(JSON.stringify(oldTask));
  newTask.parent = oldTask._id;
  newTask.children = [];
  delete newTask._id;
  this.exam.tasks[i].tasks[j] = newTask;
}

function submitUpdateExam(this: EditExamComponent): void {
  this.api
    .updateExam(this.exam._id!, removePlaceholderIds(this.exam))
    .subscribe({
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
            this.exam = parseExam(updated);
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

export function trackChangeInPoolTasks(
  this: EditExamComponent,
  id: string | undefined,
): void {
  if (id && this.isPoolTask(id)) {
    this.modifiedPoolTasks.add(id);
  }
}

export function isPoolTask(
  this: EditExamComponent,
  id: string | undefined,
): boolean {
  return !!id && this.taskPool.some(poolTask => poolTask._id === id);
}

export function isModifiedPoolTask(
  this: EditExamComponent,
  id: string | undefined,
): boolean {
  if (!this.isPoolTask(id)) {
    return false;
  }
  return this.modifiedPoolTasks.has(id!);
}

export function onCreateNewTaskChange(
  this: EditExamComponent,
  newTask: boolean,
  index: number,
): void {
  const id = this.exam.tasks[this.currentGroupView].tasks[index]._id;
  if (!id) return;
  if (newTask) {
    this.newTasksToCreate.add(id);
    return;
  }
  this.newTasksToCreate.delete(id);
}

export function onAddTag(this: EditExamComponent, index: number): void {
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
