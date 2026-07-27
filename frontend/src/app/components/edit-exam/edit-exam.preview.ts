import { take } from 'rxjs';
import { HttpResponse } from '@angular/common/http';
import type { EditExamComponent } from './edit-exam.component';
import type { PDFTaskInfo } from './edit-exam.types';

export function onPreview(this: EditExamComponent): void {
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

export function onTaskPreview(this: EditExamComponent, index: number): void {
  this.onPreview();
  this.previewReady$.pipe(take(1)).subscribe({
    next: () => {
      const pageNumber = getPDFPageNumber.call(
        this,
        index,
        this.currentGroupView,
      );

      // Update the PDF URL to jump to the specific page
      const baseUrl = this.sanitizer.sanitize(4, this.previewPdfUrl) as string;
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

export function getAbsoluteSubtaskIndex(
  this: EditExamComponent,
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

/** Returns the page number for the given subtask index in the generated PDF. */
export function getPDFPageNumber(
  this: EditExamComponent,
  index: number,
  groupIndex: number,
): number {
  const absoluteIndex = getAbsoluteSubtaskIndex.call(this, groupIndex, index);
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
