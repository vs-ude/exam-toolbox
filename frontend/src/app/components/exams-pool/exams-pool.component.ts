import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ExamCardComponent } from '../exam-card/exam-card.component';
import { Exam } from '../../exam';
import { ApiService, DownloadableJob } from '../../services/api.service';
import { saveAs } from 'file-saver';
import { LoadingService } from '../../services/loading.service';
import { MatIconModule } from '@angular/material/icon';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-exams-pool',
  standalone: true,
  imports: [
    ExamCardComponent,
    MatIconModule, // MatButtonModule is removed
    NgClass,
  ],
  templateUrl: './exams-pool.component.html',
  styleUrl: './exams-pool.component.scss'
})
export class ExamsPoolComponent implements OnInit {
  public exams: Exam[] = [];
  private downloadableJobs: DownloadableJob[] = [];

  public showDropdowns = { sorting: false, filter: false };

  @HostListener("document:click", ["$event"])
  handleDropdownStates(event: MouseEvent) {
    const elementId = (event.target as Element).id;

    if (elementId === "openSortingDropdown") {
      this.showDropdowns.sorting = !this.showDropdowns.sorting;
    } else { this.showDropdowns.sorting = false; }

    if (elementId === "openFilterDropdown") {
      this.showDropdowns.filter = !this.showDropdowns.filter;
    } else { this.showDropdowns.filter = false; }
  }

  constructor(
    private api: ApiService, 
    private loader: LoadingService, 
    private router: Router
  ) {}

  ngOnInit() {
    this.loader.loadingOn();
    forkJoin({
      allExams: this.api.getExams(),
      downloadableJobs: this.api.getDownloadableJobs()
    }).subscribe({
      next: ({ allExams, downloadableJobs }) => {
        this.exams = allExams;
        this.downloadableJobs = downloadableJobs;
        this.loader.loadingOff();
      },
      error: (err) => {
        console.error("Error fetching initial data for exams pool:", err);
        this.loader.loadingOff();
      }
    });
  }

  isDownloadable(examId: string | undefined): boolean {
    if (!examId) return false;
    return this.downloadableJobs.some(job => job.examId === examId);
  }

  onEdit(examId: string | undefined) {
    if (!examId) return;
    this.router.navigate(['/create-exam', examId]);
  }

  onDownload(event: MouseEvent, examId: string | undefined) {
    event.stopPropagation();
    if (!examId) {
      console.error("Exam ID is undefined, cannot start download.");
      return;
    }

    const job = this.downloadableJobs.find(j => j.examId === examId);
    if (!job) {
      console.error("No downloadable job found for examId:", examId);
      return;
    }

    this.downloadExam(job.jobId);
  }

  private downloadExam(jobId: string) {
    this.loader.loadingOn();
    this.api.downloadMassExamResult(jobId).subscribe({
      next: (zipBlob: Blob) => {
        saveAs(zipBlob, `exams_${jobId}.zip`);
        this.loader.loadingOff();
      },
      error: (err) => {
        console.error('Download error:', err);
        this.loader.loadingOff();
      }
    });
  }
}