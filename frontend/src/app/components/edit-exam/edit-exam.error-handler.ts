import { take } from 'rxjs';
import type { EditExamComponent } from './edit-exam.component';

export function getTaskError(
  this: EditExamComponent,
  groupIndex: number,
  taskIndex: number,
): string | undefined {
  return this.taskErrors.find(
    e => e.groupIndex === groupIndex && e.taskIndex === taskIndex,
  )?.message;
}

export function errorHandler(this: EditExamComponent, err: any): void {
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
        this.taskErrors = [{ groupIndex, taskIndex, message: parsed.message }];
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
