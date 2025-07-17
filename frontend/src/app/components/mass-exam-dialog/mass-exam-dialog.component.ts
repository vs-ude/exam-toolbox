import { Component } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { saveAs } from 'file-saver';



@Component({
  selector: 'app-mass-exam-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './mass-exam-dialog.component.html',
  styleUrl: './mass-exam-dialog.component.scss'
})
export class MassExamDialogComponent {
  selectedFile: File | null = null;

  constructor(
    private api: ApiService,
    @Inject(MAT_DIALOG_DATA) public data: { exam: any }
  ){}

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  generate() {
    if (!this.selectedFile) {
      return
    }
    this.api.generateAllExams(this.data.exam, this.selectedFile).subscribe({
      next: (allExamsPDF: Blob) => {
        saveAs(allExamsPDF, `${this.selectedFile?.name}.zip`)
      },
      error: (err) => {
        console.error('Error downloading exams as ZIP: ', err)
      }
    })
  }
}
