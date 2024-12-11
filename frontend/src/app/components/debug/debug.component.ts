import { Component } from '@angular/core';
import { Exam } from '../../exam';
import { saveAs } from 'file-saver';
import { DbService } from '../../services/db.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-debug',
  standalone: true,
  imports: [],
  templateUrl: './debug.component.html',
  styleUrl: './debug.component.scss'
})
export class DebugComponent {

  constructor(
    private dbService: DbService,
    private api: ApiService,
  ) { }

  onAddExam() {
    const title = 'Cloud, Web & Mobile'
    const questions = [
      {question: 'What is Cloud?', points: 4},
      {question: 'What is Web & Mobile?', points: 6}
    ]
    const exam: Exam = new Exam(title, questions)
  
    this.dbService.addExam(exam).subscribe({
      next: (response) => {
        console.log('Exam added successfully:', response);
      },
      error: (error) => {
        console.error('Error adding exam:', error);
      }
    })
  
    this.api.generateExamLatex(exam).subscribe({
      next: (examPDF: Blob) => {
        saveAs(examPDF, `${exam.title}.pdf`)
      },
      error: (err) => {
        console.error('Error downloading PDF: ', err)
      }
    })
  }

}