import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { Exam, Task } from '../exam';
import { User } from '../user';
import { Tag } from '../tag';

export interface JobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  downloadUrl?: string;
}

export interface DownloadableJob {
  examId: string;
  jobId: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  startMassExamGeneration(
    exam: Exam,
    list: File,
    startSeatNumber: number = 1,
  ): Observable<{ jobId: string }> {
    const formData = new FormData();
    formData.append('exam', JSON.stringify(exam));
    formData.append('list', list, list.name);
    formData.append('startSeatNumber', startSeatNumber.toString());

    return this.http.post<{ jobId: string }>(
      `${this.apiUrl}/generate-exams`,
      formData,
    );
  }

  getUser() {
    return this.http.get<User>(`/api/user`);
  }

  // -------
  // Exam related API calls
  // -------

  generateExam(exam?: Exam): Observable<HttpResponse<Blob>> {
    return this.http.post(`${this.apiUrl}/generate-exam`, exam, {
      responseType: 'blob',
      observe: 'response',
    });
  }

  addExam(exam: Exam): Observable<any> {
    return this.http.post(`${this.apiUrl}/exams`, exam);
  }

  getExams() {
    return this.http.get<Exam[]>(`${this.apiUrl}/exams`);
  }

  getExam(examId: string) {
    return this.http.get<Exam>(`${this.apiUrl}/exam/${examId}`);
  }

  getExamsWithSearchText(searchText: string) {
    return this.http.get<Exam[]>(`${this.apiUrl}/exams/search/${searchText}`);
  }

  getRecentExams(): Observable<Exam[]> {
    return this.http.get<Exam[]>(`${this.apiUrl}/exams/recent`);
  }

  updateExam(examId: string | undefined, updatedExam: Exam) {
    return this.http.put(`${this.apiUrl}/exams/update`, {
      examId,
      updatedExam,
    });
  }

  deleteExams() {
    return this.http.delete(`${this.apiUrl}/exams`);
  }

  deleteExam(examId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/exams/${examId}`);
  }

  generateAllExams(exam: Exam, list: File) {
    const formData = new FormData();

    formData.append('exam', JSON.stringify(exam));
    formData.append('list', list, list.name);
    return this.http
      .post(`${this.apiUrl}/generate-exams`, formData, { responseType: 'blob' })
      .pipe();
  }
  uploadFile(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post(`${this.apiUrl}/upload`, formData);
  }

  downloadFile(fileUrl: string) {
    return this.http.get(`${this.apiUrl}/download`, {
      responseType: 'blob',
      params: { fileUrl },
    });
  }

  getJobStatus(jobId: string): Observable<JobStatus> {
    return this.http.get<JobStatus>(`${this.apiUrl}/jobs/${jobId}/status`);
  }

  getActiveJob(examId: string): Observable<JobStatus | null> {
    return this.http.get<JobStatus | null>(
      `${this.apiUrl}/exams/${examId}/active-job`,
    );
  }

  downloadMassExamResult(jobId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/jobs/${jobId}/download`, {
      responseType: 'blob',
    });
  }

  cancelJob(jobId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/jobs/${jobId}`);
  }

  getDownloadableJobs(): Observable<DownloadableJob[]> {
    return this.http.get<DownloadableJob[]>(`${this.apiUrl}/jobs/downloadable`);
  }

  downloadExam(jobId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/jobs/${jobId}/download`, {
      responseType: 'blob',
    });
  }

  // -------
  // Task Pool related API calls
  // -------

  addTaskToPool(task: Task) {
    return this.http.post(`${this.apiUrl}/taskPool`, task);
  }

  getTaskWithIdFromPool(taskId: string): Observable<Task> {
    return this.http.get<Task>(`${this.apiUrl}/taskPool/${taskId}`);
  }

  getTasksFromPool() {
    return this.http.get<Task[]>(`${this.apiUrl}/taskPool`);
  }

  deleteTaskPool() {
    return this.http.delete(`${this.apiUrl}/taskPool`);
  }

  deleteTaskFromPool(taskId: string) {
    return this.http.delete(`${this.apiUrl}/taskPool/${taskId}`);
  }

  getTaskWithTypeFromPool(type: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/taskPool/type/${type}`);
  }

  getTaskWithUserIdFromPool(userId: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/taskPool/user/${userId}`);
  }

  getTasksWithQuestionTextFromPool(text: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/taskPool/search/${text}`);
  }

  updateTaskInPool(taskId: string, updatedTask: Task) {
    return this.http.put(`${this.apiUrl}/taskPool/${taskId}`, updatedTask);
  }

  addChildToTaskPoolTask(taskId: string, childId: string) {
    return this.http.put(`${this.apiUrl}/taskPool/addChild/${taskId}`, childId);
  }

  getTasksByTagId(tagId: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/taskPool/tags/${tagId}`);
  }

  // -------
  // Tag related API calls
  // -------

  addTag(tag: Tag): Observable<any> {
    return this.http.post(`${this.apiUrl}/tags`, tag);
  }

  getTag(tagId: string) {
    return this.http.get<Tag>(`${this.apiUrl}/tags/${tagId}`);
  }

  deleteAllTags() {
    return this.http.delete(`${this.apiUrl}/tags`);
  }

  getAllTags() {
    return this.http.get<Tag[]>(`${this.apiUrl}/tags`);
  }

  updateTag(tag: Tag) {
    return this.http.put(`${this.apiUrl}/tags/${tag._id}`, tag);
  }
}
