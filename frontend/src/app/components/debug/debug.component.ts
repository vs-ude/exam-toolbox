import { Component } from '@angular/core';
import { Exam, Task } from '../../exam';
import { saveAs } from 'file-saver';
import { ApiService } from '../../services/api.service';


const courseName = 'DEBUG EXAM';
const examinerName = 'Dr. Jane Smith';
const semester = 'Fall 2025';
const date = '2025-12-15';
const examLengthMinutes = 120;

const tasks: Task[] = [
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
    points: 4,
    tags: [{ name: 'Cloud', color: '#4caf50', textColor: '#fff' }],
    createdBy: "Hans Wurst",
    createdAt: new Date(),
    lastUsed: new Date(),
    usedIn: [],
    children: [],
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
    points: 6,
    tags: [],
    createdBy: "placeholder",
    createdAt: new Date(),
    lastUsed: new Date(),
    usedIn: [],
    children: [],
    
  }
];

const exam: Exam = new Exam(
  courseName,
  examinerName,
  semester,
  date,
  examLengthMinutes,
  [{ groupNumber: 1, groupTitle: { DE: "Titel", EN: "Title" }, tasks: tasks }]
);

@Component({
  selector: 'app-debug',
  standalone: true,
  imports: [],
  templateUrl: './debug.component.html',
  styleUrl: './debug.component.scss'
})
export class DebugComponent {
  selectedFile: File | null = null

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

  onGenerateExam() {
    this.api.generateExam(exam).subscribe({
      next: (examPDF: Blob) => {
        saveAs(examPDF, `${exam.courseName}.pdf`)
      },
      error: (err) => {
        console.error('Error downloading PDF: ', err)
      }
    })
  }

  onUpdateExam() {
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

  onDeleteExams() {
    this.api.deleteExams().subscribe(
      res => {
        console.log('Exams deleted successfully: ', res)
      },
      err => {
        console.error('Error deleting exams: ', err)
      }
    )
  }

  onDeleteTaskPool() {
    this.api.deleteTaskPool().subscribe(
      res => {
        console.log('Task-Pool deleted successfully: ', res)
      },
      err => {
        console.error('Error deleting Task-Pool: ', err)
      }
    )
  }

  onGenerateAllExams() {
    if (!this.selectedFile) {
      return
    }
    this.api.generateAllExams(exam, this.selectedFile).subscribe({
      next: (allExamsPDF: Blob) => {
        saveAs(allExamsPDF, `${this.selectedFile?.name}.zip`)
      },
      error: (err) => {
        console.error('Error downloading exams as ZIP: ', err)
      }
    })
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      const file: File = input.files[0]
      this.selectedFile = file
      console.log('Selected file:', file.name)
      console.log('File: ', file)
      console.log('Exam: ', exam)
    }
  }


  onDeleteTaskFromPool() {

    this.api.getTasksFromPool().subscribe(
      res => {
        console.log('Tasks from pool: ', res);
        const poolTask = res[0].taskId;
        this.api.deleteTaskFromPool(poolTask).subscribe(
          res => {
            console.log('Task deleted successfully: ', res)
          },
          err => {
            console.error('Error deleting task from pool: ', err)
          }
        )
      },
      err => console.error('Error getting tasks from pool: ', err)
    )
  }

  onCreateTask() {
    this.api.addTaskToPool(tasks[0]).subscribe(
      res => {
        console.log('Task added successfully: ', res);
      },
      error => {
        console.error('Error adding task to pool: ', error);
      }
    );
  }

  onGetDownloadableList(){
    this.api.getDownloadableJobs().subscribe(downloadableJobs => {
      console.log("Downloadable Jobs: ")
      console.table(downloadableJobs)
    })
  }
}