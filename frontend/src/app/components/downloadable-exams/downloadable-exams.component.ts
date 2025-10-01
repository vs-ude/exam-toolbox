import { Component, HostListener } from '@angular/core';
import { ExamCardComponent } from '../exam-card/exam-card.component';
import { Exam } from '../../exam';
import { ApiService, DownloadableJob } from '../../services/api.service';
import { saveAs } from 'file-saver';
import { LoadingService } from '../../services/loading.service';
import { MatIcon } from '@angular/material/icon';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-downloadable-exams',
  standalone: true,
  imports: [
    ExamCardComponent,
    MatIcon,
    NgClass,
  ],
  templateUrl: './downloadable-exams.component.html',
  styleUrl: './downloadable-exams.component.scss'
})
export class DownloadableExamsComponent {

  public exams: Exam[] = [];
  private downloadableJobs: DownloadableJob[] = [];

  public showDropdowns = { sorting: false, filter: false, }
  @HostListener("document:click", ["$event"])
  handleDropdownStates(event: MouseEvent) {
    const elementId = (event.target as Element).id

    if (elementId === "openSortingDropdown") {
      this.showDropdowns.sorting = !this.showDropdowns.sorting;
    } else { this.showDropdowns.sorting = false; }

    if (elementId === "openFilterDropdown") {
      this.showDropdowns.filter = !this.showDropdowns.filter;
    } else { this.showDropdowns.filter = false; }
  }

  constructor(private api: ApiService, private loader: LoadingService) {
    this.api.getDownloadableJobs().subscribe(downloadableJobs => {
      this.downloadableJobs = downloadableJobs;

      this.downloadableJobs.forEach(job => {
        this.api.getExam(job.examId).subscribe(exam => {
          this.exams.push(exam);
        })
      })
    })
  }

  onDownload(examId: string | undefined) {
    if (!examId) {
      console.error("Exam ID is undefined");
      return;
    }

    const job = this.downloadableJobs.find(job => job.examId === examId);
    if (!job) {
      console.error("No downloadable job found for examId:", examId);
      return;
    }

    console.log("Starting download for jobId:", job.jobId);
    this.downloadExam(job.jobId);

  }

  private downloadExam(jobId: string) {
    this.loader.loadingOn();
    this.api.downloadMassExamResult(jobId).subscribe({
      next: (zipBlob: Blob) => {
        saveAs(zipBlob, `exams_${jobId}.zip`)
        this.loader.loadingOff();
      },
      error: (err) => {
        console.error('Download error:', err)
        this.loader.loadingOff();
      }
    })
  }

}
