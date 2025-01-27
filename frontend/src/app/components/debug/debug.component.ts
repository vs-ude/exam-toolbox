import { Component } from '@angular/core';
import { Exam } from '../../exam';
import { saveAs } from 'file-saver';
import { ApiService } from '../../services/api.service';



const examId = 'exam123';
const title = 'Cloud Web Mobile Development Exam';
const courseName = 'Introduction to Cloud, Web, and Mobile Development';
const examinerName = 'Dr. Jane Smith';
const semester = 'Fall 2025';
const date = '2025-12-15';
const examLengthMinutes = 120;
const tasks = [
  {
    taskId: 'task1',
    type: 'shortAnswer',
    question: {
      DE: 'Was ist Cloud?',
      EN: 'What is Cloud?'
    },
    solution: {
      DE: '',
      EN: ''
    },
    points: 4
  },
  {
    taskId: 'task2',
    type: 'shortAnswer',
    question: {
      DE: 'Was ist Web Mobile?',
      EN: 'What is Web Mobile?'
    },
    solution: {
      DE: '',
      EN: ''
    },
    points: 6
  }
];
const exam: Exam = new Exam(
  examId,
  title,
  courseName,
  examinerName,
  semester,
  date,
  examLengthMinutes,
  tasks
);


@Component({
  selector: 'app-debug',
  standalone: true,
  imports: [],
  templateUrl: './debug.component.html',
  styleUrl: './debug.component.scss'
})
export class DebugComponent {

  constructor(
    private api: ApiService,
  ) { }

  onAddExam() {  
    this.api.addExam(exam).subscribe(
      response => {
        console.log('Exam added successfully: ', response);
      },
      error => {
        console.error('Error adding exam: ', error);
      }
    );
  }

  onGenerateExam(){
    this.api.generateExam(exam).subscribe({
      next: (examPDF: Blob) => {
        saveAs(examPDF, `${exam.title}.pdf`)
      },
      error: (err) => {
        console.error('Error downloading PDF: ', err)
      }
    })
  }
  
}