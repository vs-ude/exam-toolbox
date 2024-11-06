import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, retry, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:3000/api'; // Update to your backend URL

  constructor(private http: HttpClient) {}

  getTestMessage(): Observable<any> {
    
    return this.http.get(`${this.apiUrl}/test`).pipe(
      retry(3),
      catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    if (error.status === 0) {
      console.warn('A client-side or network error occurred:', error.error);
    } else {
      // The backend returned an unsuccessful response code.
      console.warn(
        `Backend returned code ${error.status}, body was: `, error.error);
    }
    return throwError(() => new Error('Something bad happened; please try again later.'));
  }
}
