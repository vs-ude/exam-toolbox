import { Component } from '@angular/core';
import { Exam, Task } from '../../exam';
import { saveAs } from 'file-saver';
import { ApiService } from '../../services/api.service';


const courseName = 'Cloud Web Mobile Development Exam';
const examinerName = 'Dr. Jane Smith';
const semester = 'Fall 2025';
const date = '2025-12-15';
const examLengthMinutes = 120;
    
const tasks:Task[] = [
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
        saveAs(examPDF, `${exam.courseName}.pdf`)
      },
      error: (err) => {
        console.error('Error downloading PDF: ', err)
      }
    })
  }

  onUpdateExam(){
    let id: string = '67a77bdea72f7082a9a4283a' // An id of an Exam in your DB. Needs to be updated for testing if you don't have a Exam with this ID.
    
    this.api.updateExam(id, exam).subscribe(
      response => {
        console.log('Exam updated successfully: ', response);
      },
      error => {
        console.error('Error updating exam: ', error);
      }
    )   
  }

  onDeleteExams(){
    this.api.deleteExams().subscribe(
      res => {
        console.log('Exams deleted successfully: ', res)
      },
      err => {
        console.error('Error deleting exams: ', err)
      }
    )
  }
  
}