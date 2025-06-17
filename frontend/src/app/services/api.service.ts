import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { Exam, Task } from '../exam';
import { User } from '../user'

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = '/api';

  constructor(
    private http: HttpClient
  ) { }

  generateExam(exam?: Exam): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/generate-exam`, exam, { responseType: 'blob' })
  }

  addExam(exam: Exam): Observable<any> {
    return this.http.post(`${this.apiUrl}/exams`, exam)
  }

  getExams() {
    return this.http.get<Exam[]>(`${this.apiUrl}/exams`)
  }

  getExam(examId: string) {
    return this.http.get<Exam>(`${this.apiUrl}/exam/${examId}`)
  }

  getUser(){
    return this.http.get<User>(`/api/user`)
  }

  updateExam(examId: (string | undefined), updatedExam: Exam) {
    return this.http.put(`${this.apiUrl}/exams/update`, {
      examId,
      updatedExam
    });
  }

  deleteExams() {
    return this.http.delete(`${this.apiUrl}/exams`)
  }

  generateAllExams(exam: Exam, list: File) {
    const formData = new FormData()

    formData.append('exam', JSON.stringify(exam))
    formData.append('list', list, list.name)
    return this.http.post(`${this.apiUrl}/generate-exams`, formData, { responseType: 'blob' }).pipe(timeout(600000))
  }

  uploadFile(file: File) {
    const formData = new FormData();
    formData.append("image", file);
    return this.http.post(`${this.apiUrl}/upload`, formData);
  }

  downloadFile(fileUrl: string) {
    return this.http.get(`${this.apiUrl}/download`, { responseType: 'blob', params: { fileUrl } });
  }

  addTaskToPool(task: Task) {
    return this.http.post(`${this.apiUrl}/taskPool`, task)
  }

  getTasksFromPool() {
    return this.http.get<Task[]>(`${this.apiUrl}/taskPool`)
  }

  deleteTaskPool() {
    return this.http.delete(`${this.apiUrl}/taskPool`)
  }

  deleteTaskFromPool(taskId: string) {
    return this.http.delete(`${this.apiUrl}/taskPool/${taskId}`);
  }

  getTaskWithTypeFromPool(type: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/taskPool/type/${type}`);
  }

  getTaskWithTagFromPool(tag: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/taskPool/tag/${tag}`);
  }

  getTaskWithUserIdFromPool(userId: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/taskPool/user/${userId}`);
  }

}
