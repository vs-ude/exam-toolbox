import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Exam } from "../exam";

@Injectable({
  providedIn: 'root'
})

export class DbService {
  private apiUrl = 'http://localhost:3000/api/exams';

  constructor(
    private http: HttpClient
  ) { }

  addExam(exam: Exam): Observable<any>{
    console.log(exam.questions + " | " + exam.title)
    return this.http.post(this.apiUrl, exam)
  }
}
