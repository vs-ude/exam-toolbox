import { Component, Inject, OnDestroy } from '@angular/core';
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
    FormsModule // <-- Add FormsModule here
  ],
  templateUrl: './mass-exam-dialog.component.html',
  styleUrl: './mass-exam-dialog.component.scss'
})
export class MassExamDialogComponent implements OnDestroy {
  selectedFile: File | null = null
  jobId: string | null = null
  jobStatus: JobStatus | null = null
  isLoading = false
  errorMessage: string | null = null
  autoDownload = false
  downloadSuccessful = false
  private pollingInterval: any

  constructor(
    private api: ApiService,
    private dialogRef: MatDialogRef<MassExamDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { exam: any }, // passes exam object to dialog
    private router: Router
  ){}

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0]
    this.errorMessage = null
  }

  generate() {
    if (!this.selectedFile) return
    
    this.isLoading = true
    this.errorMessage = null
    this.jobStatus = null

    this.api.startMassExamGeneration(this.data.exam, this.selectedFile).subscribe({
      next: (response) => {
        this.jobId = response.jobId
        console.log(`Job started with ID: ${this.jobId}`)
        this.startPolling()
      },
      error: (err) => {
        this.handleError('Failed to start the generation job.')
        console.error('Error starting job: ', err)
      }
    })
  }

  cancelGeneration() {
    if (!this.jobId) return

    this.stopPolling()

    this.api.cancelJob(this.jobId).subscribe({
      next: () => {
        this.handleError("Generation has been cancelled.")
      },
      error: (err) => {
        this.handleError("Cancellation requested, but an error occurred.")
        console.error("Error cancelling job:", err)
      }
    })
  }

  // polls for status for progression bar
  private startPolling() {
    this.pollingInterval = setInterval(() => {
      if (!this.jobId) {
        this.stopPolling()
        return
      }

      this.api.getJobStatus(this.jobId).subscribe({
        next: (status) => {
          this.jobStatus = status
          if (status.status === 'completed') {
            this.stopPolling()
            this.isLoading = false
            if (this.autoDownload) {
              this.downloadResult()
            }
          } else if (status.status === 'failed') {
            this.stopPolling()
            this.handleError('Exam generation failed. Please check the backend logs for details.')
          }
        },
        error: (err) => {
          this.stopPolling()
          this.handleError('Failed to get job status.')
          console.error('Polling error:', err)
        }
      })
    }, 1000)
  }

  downloadResult() {
    if (!this.jobId) return

    this.api.downloadMassExamResult(this.jobId).subscribe({
      next: (zipBlob: Blob) => {
        saveAs(zipBlob, `exams_${this.jobId}.zip`)
        this.isLoading = false
        this.downloadSuccessful = true
      },
      error: (err) => {
        this.handleError('Failed to download the final ZIP file.')
        console.error('Download error:', err)
      }
    })
  }

  navigateToExamsPool() {
    this.dialogRef.close()
    this.router.navigate(['/exams-pool'])
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
  }

  private handleError(message: string) {
    this.errorMessage = message
    this.isLoading = false
    this.jobId = null
  }

  ngOnDestroy() {
    this.stopPolling()
  }
}