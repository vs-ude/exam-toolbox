import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class DbService {
  private apiUrl = 'http://localhost:3000/api/exams';

  constructor(
    private http: HttpClient
  ) { }

  addExam(name: string, comment: string): Observable<any>{
    const exam = { name, comment }
    return this.http.post(this.apiUrl, exam)
  }
}
