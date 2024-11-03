import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:3000/api'; // Update to your backend URL

  constructor(private http: HttpClient) {}

  getTestMessage(): Observable<any> {
    return this.http.get(`${this.apiUrl}/test`);
  }
}
