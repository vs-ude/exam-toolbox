import { Component } from '@angular/core';
import { Exam } from '../../types/shared/exam';
import { Task } from '../../types/shared/tasks';
import { saveAs } from 'file-saver';
import { ApiService } from '../../services/api.service';
import { Tag } from '../../types/shared/tag';
import { HttpResponse } from '@angular/common/http';

const courseName = 'DEBUG EXAM';
const examinerName = 'Dr. Jane Smith';
const semester = 'Fall 2025';
const date = '2025-12-15';
const examLengthMinutes = 120;

const tasks: Task[] = [
  {
    _id: 'task1',
    type: 'shortAnswer',
    question: {
      DE: 'Was ist Cloud?',
      EN: 'What is Cloud?',
    },
    solution: {
      DE: '',
      EN: '',
    },
    points: 4,
    tagIds: ['tag1'],
    tags: [
      { _id: 'tag1', name: 'Cloud', color: '#0000FF', textColor: '#FFFFFF' },
    ],
    createdBy: 'Hans Wurst',
    createdAt: new Date(),
    lastUsed: new Date(),
    usedIn: [],
    children: [],
  },
  {
    _id: 'task2',
    type: 'shortAnswer',
    question: {
      DE: 'Was ist Web Mobile?',
      EN: 'What is Web Mobile?',
    },
    solution: {
      DE: '',
      EN: '',
    },
    points: 6,
    tagIds: [],
    tags: [],
    createdBy: 'placeholder',
    createdAt: new Date(),
    lastUsed: new Date(),
    usedIn: [],
    children: [],
  },
];

const exam: Exam = new Exam(
  courseName,
  examinerName,
  semester,
  date,
  examLengthMinutes,
  [{ groupNumber: 1, groupTitle: { DE: 'Titel', EN: 'Title' }, tasks: tasks }],
);

@Component({
  selector: 'app-debug',
  standalone: true,
  imports: [],
  templateUrl: './debug.component.html',
  styleUrl: './debug.component.scss',
})
export class DebugComponent {
  selectedFile: File | null = null;

  constructor(private api: ApiService) {}

  onAddExam() {
    this.api.addExam(exam).subscribe(
      response => {
        console.log('Exam added successfully: ', response);
      },
      error => {
        console.error('Error adding exam: ', error);
      },
    );
  }

  onGenerateExam() {
    this.api.generateExam(exam).subscribe({
      next: (response: HttpResponse<Blob>) => {
        const pdfBlob = response.body;
        if (pdfBlob) {
          saveAs(pdfBlob, `${exam.courseName}.pdf`);
        }

        const subtaskHeader = response.headers.get('X-Subtask-Info');
        const subtaskInfo = subtaskHeader ? JSON.parse(subtaskHeader) : [];
        console.log('Subtask Info from header:', subtaskInfo);

        const hasErrors = subtaskInfo.some(
          (info: any) => info.logFileBoundaryError === true,
        );
        if (hasErrors) {
          alert(
            'Warning: A layout error was detected! Check the console for details.',
          );
        }
      },
      error: err => {
        console.error('Error generating exam preview: ', err);
      },
    });
  }

  onUpdateExam() {
    let id: string = '67a77bdea72f7082a9a4283a'; // An id of an Exam in your DB. Needs to be updated for testing if you don't have a Exam with this ID.

    this.api.updateExam(id, exam).subscribe(
      response => {
        console.log('Exam updated successfully: ', response);
      },
      error => {
        console.error('Error updating exam: ', error);
      },
    );
  }

  onDeleteExams() {
    this.api.deleteExams().subscribe(
      res => {
        console.log('Exams deleted successfully: ', res);
      },
      err => {
        console.error('Error deleting exams: ', err);
      },
    );
  }

  onDeleteTaskPool() {
    this.api.deleteTaskPool().subscribe(
      res => {
        console.log('Task-Pool deleted successfully: ', res);
      },
      err => {
        console.error('Error deleting Task-Pool: ', err);
      },
    );
  }

  onGenerateAllExams() {
    if (!this.selectedFile) {
      return;
    }
    this.api.generateAllExams(exam, this.selectedFile).subscribe({
      next: (allExamsPDF: Blob) => {
        saveAs(allExamsPDF, `${this.selectedFile?.name}.zip`);
      },
      error: err => {
        console.error('Error downloading exams as ZIP: ', err);
      },
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file: File = input.files[0];
      this.selectedFile = file;
      console.log('Selected file:', file.name);
      console.log('File: ', file);
      console.log('Exam: ', exam);
    }
  }

  onDeleteTaskFromPool() {
    this.api.getTasksFromPool().subscribe(
      res => {
        console.log('Tasks from pool: ', res);
        const poolTask = res[0]._id!;
        this.api.deleteTaskFromPool(poolTask).subscribe(
          res => {
            console.log('Task deleted successfully: ', res);
          },
          err => {
            console.error('Error deleting task from pool: ', err);
          },
        );
      },
      err => console.error('Error getting tasks from pool: ', err),
    );
  }

  onCreateTask() {
    this.api.addTaskToPool(tasks[0]).subscribe(
      res => {
        console.log('Task added successfully: ', res);
      },
      error => {
        console.error('Error adding task to pool: ', error);
      },
    );
  }

  onGetDownloadableList() {
    this.api.getDownloadableJobs().subscribe(downloadableJobs => {
      console.log('Downloadable Jobs: ');
      console.table(downloadableJobs);
    });
  }

  onDeleteAllTags() {
    this.api.deleteAllTags().subscribe(
      res => {
        console.log('All tags deleted successfully: ', res);
      },
      err => {
        console.error('Error deleting all tags: ', err);
      },
    );
  }

  onGetAllTags() {
    this.api.getAllTags().subscribe(
      tags => {
        console.log('All Tags: ');
        console.table(tags);
      },
      err => {
        console.error('Error getting all tags: ', err);
      },
    );
  }
}
