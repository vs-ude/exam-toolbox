import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Exam } from '../exam';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  generateExamLatex(exam: Exam): Observable<Blob>{
    return this.http.post(`${this.apiUrl}/generate-exam`, exam, {responseType: 'blob'})
  }
}
