import { Component } from '@angular/core';
import { ExamCardComponent } from '../exam-card/exam-card.component';
import { Exam } from '../../exam';
import { ApiService, DownloadableJob } from '../../services/api.service';
import { saveAs } from 'file-saver';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-downloadable-exams',
  standalone: true,
  imports: [
    ExamCardComponent,

  ],
  templateUrl: './downloadable-exams.component.html',
  styleUrl: './downloadable-exams.component.scss'
})
export class DownloadableExamsComponent {

  public exams: Exam[] = [new Exam("Test Course", "Test Examiner", "WS 2023/24", "2024-10-10", 90, [], "testId")];
  private downloadableJobs: DownloadableJob[] = [];

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

  onDownload(examId: string|undefined) {
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

  private downloadExam(jobId: string){
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
