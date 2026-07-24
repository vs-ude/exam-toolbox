import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';

import { AutosaveWrapper } from '../../services/autosave.service';
import { Exam, parseExam } from '../../types/shared/exam';

export interface ConflictDialogData {
  dbExam: Exam;
  localWrapper: AutosaveWrapper;
  isNewExam?: boolean;
}

@Component({
  selector: 'app-conflict-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
  ],
  providers: [DatePipe],
  templateUrl: './conflict-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './conflict-dialog.component.scss',
})
export class ConflictDialogComponent implements OnInit, OnDestroy {
  locale: string;
  timezone: string;
  localDate: Date;
  dbDate: Date;
  selectedVersion: 'local' | 'server' = 'local';

  constructor(
    public dialogRef: MatDialogRef<ConflictDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConflictDialogData,
    private datePipe: DatePipe,
  ) {
    this.data = {
      ...data,
      dbExam: parseExam(data.dbExam),
      localWrapper: {
        ...data.localWrapper,
        data: parseExam(data.localWrapper.data),
      },
    };
    this.localDate = new Date(this.data.localWrapper.timestamp);
    this.dbDate = new Date((this.data.dbExam as any).updatedAt || Date.now());
    this.locale = navigator.languages ? navigator.languages[0] : 'en-GB';
    this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (this.data.dbExam) this.data.dbExam.fillMeta();
    this.data.localWrapper.data.fillMeta();
  }

  ngOnInit() {}

  ngOnDestroy() {}
}
