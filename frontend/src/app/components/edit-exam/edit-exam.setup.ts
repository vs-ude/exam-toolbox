import { forkJoin } from 'rxjs';
import { Exam, parseExam } from '../../types/shared/exam';
import { newDefaultExam } from '../../services/exam.service';

import {
  ExamSetupDialogComponent,
  ExamSetupDialogData,
} from '../exam-setup-dialog/exam-setup-dialog.component';
import { ConflictDialogComponent } from '../conflict-dialog/conflict-dialog.component';
import type { EditExamComponent } from './edit-exam.component';

export function onSetup(this: EditExamComponent): void {
  openSetupDialog.call(this);
}

export function openSetupDialog(this: EditExamComponent): void {
  const data: ExamSetupDialogData = this.isExamSetup ? { exam: this.exam } : {};
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

export function importExam(this: EditExamComponent): void {
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
          this.exam = newDefaultExam(this.api);
          openSetupDialog.call(this);
        }
      });
    } else {
      this.exam = newDefaultExam(this.api);
      openSetupDialog.call(this);
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
            this.isExamSetup = true;
            this.exam.fillMeta();
            this.snackBar.open('Unsaved changes restored.', 'OK', {
              duration: 3000,
            });
          } else {
            initializeExamData.call(this, dbExam);
            this.autosaveService.clearLocal(dbExam._id);
            this.snackBar.open('Discarded local draft.', 'OK', {
              duration: 3000,
            });
          }
        });
      } else {
        if (localWrapper) this.autosaveService.clearLocal(dbExam._id);
        initializeExamData.call(this, dbExam);
      }
    },
    error => console.error(error),
  );
}

export function initializeExamData(
  this: EditExamComponent,
  response: Exam,
): void {
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

export function importPoolTasks(this: EditExamComponent): void {
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
