import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  output,
  SimpleChange,
  SimpleChanges,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTooltip } from '@angular/material/tooltip';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { ExamStub } from '../../types/shared/stubs';
import { DownloadableJob } from '../../services/api.service';

@Component({
  selector: 'app-exams-table',
  imports: [MatTooltip, MatTableModule, MatSortModule, MatIconModule],
  templateUrl: './exams-table.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './exams-table.component.scss',
})
export class ExamsTableComponent implements AfterViewInit, OnChanges {
  @Input() exams: ExamStub[] = [];
  @Input() downloadableJobs: DownloadableJob[] = [];
  @Input() readOnly: boolean = false; //  don´t show download and delete buttons when true
  @Output() examSelectedEvent = new EventEmitter<string>();
  @Output() downloadExamEvent = new EventEmitter<{
    event: MouseEvent;
    examId: string | undefined;
  }>();
  @Output() deleteExamEvent = new EventEmitter<{
    event: MouseEvent;
    examId: string | undefined;
  }>();

  private allColumns: string[] = [
    'courseName',
    'semester',
    'date',
    'updatedAt',
    'lastEditedBy',
    'download',
    'delete',
  ];
  private readOnlyColumns: string[] = [
    'courseName',
    'semester',
    'date',
    'updatedAt',
    'lastEditedBy',
  ];
  public dataSource = new MatTableDataSource<ExamStub>(this.exams);
  get displayedColumns(): string[] {
    return this.readOnly ? this.readOnlyColumns : this.allColumns;
  }
  @ViewChild(MatSort) sort?: MatSort;

  ngAfterViewInit() {
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['exams']) {
      this.dataSource.data = this.exams;
    }
  }

  public normalizeDate(dateString: string): string {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return original string if it's not a valid date
    }
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  public stringifyDate(date: any): string {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('de-DE');
  }

  public onEdit(examId: string | undefined) {
    if (!examId) {
      console.error('Exam ID is undefined');
      return;
    }
    this.examSelectedEvent.emit(examId);
  }

  public isDownloadable(examId: string | undefined): boolean {
    if (!examId) return false;
    return this.downloadableJobs.some(job => job.examId === examId);
  }

  public onDownload(event: MouseEvent, examId: string | undefined) {
    this.downloadExamEvent.emit({ event, examId });
  }

  public onDeleteExam(event: MouseEvent, examId: string | undefined) {
    this.deleteExamEvent.emit({ event, examId });
  }
}
