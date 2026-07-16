import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService, JobStatus } from '../../services/api.service';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { saveAs } from 'file-saver';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mass-exam-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    FormsModule,
  ],
  templateUrl: './mass-exam-dialog.component.html',
  styleUrl: './mass-exam-dialog.component.scss',
})
export class MassExamDialogComponent implements OnInit, OnDestroy {
  selectedFile: File | null = null;

  // Needed for when generating an exam for a single student
  isSingleMode = false;
  startSeatNumber = 1;
  singleStudent = {
    firstName: '',
    lastName: '',
    studentId: '',
  };

  // Job State
  jobId: string | null = null;
  jobStatus: JobStatus | null = null;
  isLoading = true;
  errorMessage: string | null = null;
  autoDownload = false;
  downloadSuccessful = false;
  private pollingInterval: any;

  constructor(
    private api: ApiService,
    private dialogRef: MatDialogRef<MassExamDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { exam: any }, // passes exam object to dialog
    private router: Router,
  ) {}

  ngOnInit() {
    // Check backend if there is already a running job for this exam
    this.api.getActiveJob(this.data.exam._id).subscribe({
      next: activeJob => {
        if (activeJob) {
          console.log(`Resuming active job: ${activeJob.jobId}`);

          // Restore state
          this.jobId = activeJob.jobId;

          // Manually set jobStatus so the HTML progress bar renders immediately, instead of showing "Starting job..." spinner
          this.jobStatus = {
            jobId: activeJob.jobId,
            status: activeJob.status,
            progress: activeJob.progress,
            downloadUrl: undefined,
          };

          this.isLoading = true; // Keep loading true to show progress bar

          // Restart the polling loop
          this.startPolling();
        } else {
          // No job found? Stop loading and show the init form
          this.isLoading = false;
        }
      },
      error: err => {
        console.error('Failed to check active job:', err);
        // On error just show the upload form so user isn't stuck
        this.isLoading = false;
      },
    });
  }

  onFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
      this.errorMessage = null;
    }
  }

  createSingleStudentCsv(): File {
    // Backend expects the padding rows to be present
    // And SheetJS on the Backend is too smart, so the rows can't be empty
    const dummyRow = 'IGNORE,IGNORE,IGNORE,IGNORE,IGNORE,IGNORE';
    const paddingRows = [dummyRow, dummyRow, dummyRow, dummyRow, dummyRow].join(
      '\n',
    );

    // Columns match backend header: [0]PlanId, [1]ExamNr, [2]Title, [3]LastName, [4]FirstName, [5]StudentId
    const studentRow = `123,DUMMY,SingleExam,${this.singleStudent.lastName},${this.singleStudent.firstName},${this.singleStudent.studentId}`;

    const csvContent = paddingRows + '\n' + studentRow;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    return new File([blob], 'single_student_generated.csv', {
      type: 'text/csv',
    });
  }

  generate() {
    this.isLoading = true;
    this.errorMessage = null;
    this.jobStatus = null;

    let fileToUpload: File;

    if (this.isSingleMode) {
      // Generate exam for single student
      if (
        !this.singleStudent.firstName ||
        !this.singleStudent.lastName ||
        !this.singleStudent.studentId
      ) {
        this.handleError('Please fill out all student fields.');
        return;
      }
      fileToUpload = this.createSingleStudentCsv();
    } else {
      // Mass Exam Generation
      if (!this.selectedFile) {
        this.handleError('Please select a file.');
        return;
      }
      fileToUpload = this.selectedFile;
    }

    this.api
      .startMassExamGeneration(
        this.data.exam,
        fileToUpload,
        this.startSeatNumber,
      )
      .subscribe({
        next: response => {
          this.jobId = response.jobId;
          console.log(`Job started with ID: ${this.jobId}`);
          this.startPolling();
        },
        error: err => {
          this.handleError('Failed to start the generation job.');
          console.error('Error starting job: ', err);
        },
      });
  }

  cancelGeneration() {
    if (!this.jobId) return;

    this.stopPolling();

    this.api.cancelJob(this.jobId).subscribe({
      next: () => {
        this.handleError('Generation has been cancelled.');
      },
      error: err => {
        this.handleError('Cancellation requested, but an error occurred.');
        console.error('Error cancelling job:', err);
      },
    });
  }

  // polls for status for progression bar
  private startPolling() {
    this.stopPolling();

    this.pollingInterval = setInterval(() => {
      if (!this.jobId) {
        this.stopPolling();
        return;
      }

      this.api.getJobStatus(this.jobId).subscribe({
        next: status => {
          this.jobStatus = status;
          if (status.status === 'completed') {
            this.stopPolling();
            this.isLoading = false;
            if (this.autoDownload) {
              this.downloadResult();
            }
          } else if (status.status === 'failed') {
            this.stopPolling();
            this.handleError(
              'Exam generation failed. Please check the backend logs for details.',
            );
          }
        },
        error: err => {
          this.stopPolling();
          this.handleError('Failed to get job status.');
          console.error('Polling error:', err);
        },
      });
    }, 1000);
  }

  downloadResult() {
    if (!this.jobId) return;

    this.api.downloadMassExamResult(this.jobId).subscribe({
      next: (zipBlob: Blob) => {
        saveAs(zipBlob, `exams_${this.jobId}.zip`);
        this.isLoading = false;
        this.downloadSuccessful = true;
      },
      error: err => {
        this.handleError('Failed to download the final ZIP file.');
        console.error('Download error:', err);
      },
    });
  }

  navigateToExamsPool() {
    this.dialogRef.close();
    this.router.navigate(['/exams-pool']);
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private handleError(message: string) {
    this.errorMessage = message;
    this.isLoading = false;
    this.jobId = null;
  }

  ngOnDestroy() {
    this.stopPolling();
  }
}
