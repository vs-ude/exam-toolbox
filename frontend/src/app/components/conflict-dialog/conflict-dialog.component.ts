import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';

import { AutosaveWrapper } from '../../services/autosave.service';
import { Theme, ThemeToggleService } from '../../services/theme-toggle.service';
import { Exam } from '../../types/shared/exam';

export interface ConflictDialogData {
  dbExam: Exam;
  localWrapper: AutosaveWrapper;
  isNewExam?: boolean;
}

@Component({
  selector: 'app-conflict-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  providers: [DatePipe],
  templateUrl: './conflict-dialog.component.html',
  styleUrl: './conflict-dialog.component.scss',
})
export class ConflictDialogComponent implements OnInit, OnDestroy {
  localDate: Date;
  dbDate: Date;
  isDarkTheme = false;
  private themeSub?: Subscription;

  constructor(
    public dialogRef: MatDialogRef<ConflictDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConflictDialogData,
    private themeService: ThemeToggleService,
  ) {
    this.localDate = new Date(this.data.localWrapper.timestamp);
    this.dbDate = new Date((this.data.dbExam as any).updatedAt || Date.now());
  }

  ngOnInit() {
    this.themeSub = this.themeService.themeChanged$.subscribe(
      (theme: Theme) => {
        this.isDarkTheme = theme === Theme.DARK;
      },
    );
  }

  ngOnDestroy() {
    this.themeSub?.unsubscribe();
  }

  getTaskCount(exam: Exam): number {
    if (!exam || !exam.tasks) return 0;
    return exam.tasks.reduce(
      (acc, group) => acc + (group.tasks ? group.tasks.length : 0),
      0,
    );
  }
}
