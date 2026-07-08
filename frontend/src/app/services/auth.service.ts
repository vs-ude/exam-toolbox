import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, map, Observable, of, tap } from 'rxjs';
import { User } from '../user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = '/api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadSession();
  }

  /**
   * Retrieves the stored token.
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Decodes a JWT token payload.
   */
  private decodeToken(token: string): User | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      const decoded = JSON.parse(jsonPayload) as any;
      if (decoded) {
        decoded.id = decoded.sub || '';
        decoded.roles = decoded.groups || [];
      }

      return decoded as User;
    } catch (e) {
      console.error('Error decoding JWT token', e);
      return null;
    }
  }

  /**
   * Loads session from local storage on app start.
   */
  private loadSession(): void {
    const token = this.getToken();
    if (token) {
      const decoded = this.decodeToken(token);
      if (decoded && !this.isTokenExpired(decoded)) {
        this.currentUserSubject.next(decoded);
      } else {
        this.clearSession();
      }
    }
  }

  /**
   * Checks if the decoded token has expired.
   */
  private isTokenExpired(user: User): boolean {
    if (!user.exp) {
      return false;
    }
    // exp is in seconds, Date.now() is in ms
    return user.exp * 1000 < Date.now();
  }

  /**
   * Performs authentication with LDAP credentials.
   */
  login(username: string, password: string): Observable<User> {
    return this.http
      .post<{ token: string }>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        map(response => {
          const token = response.token;
          const decoded = this.decodeToken(token);
          if (!decoded) {
            throw new Error('Invalid token format');
          }
          localStorage.setItem('auth_token', token);
          this.currentUserSubject.next(decoded);
          return decoded;
        }),
      );
  }

  /**
   * Validates the active session against the backend validate route.
   */
  validateSession(): Observable<boolean> {
    const token = this.getToken();
    if (!token) {
      this.clearSession();
      return of(false);
    }

    const decoded = this.decodeToken(token);
    if (!decoded || this.isTokenExpired(decoded)) {
      this.clearSession();
      return of(false);
    }

    return this.http.get<any>(`${this.apiUrl}/validate`).pipe(
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
    );
  }

  /**
   * Checks whether there is an active session locally.
   */
  isAuthenticated(): boolean {
    const user = this.currentUserSubject.value;
    return !!user && !this.isTokenExpired(user);
  }

  /**
   * Clears the user session and token.
   */
  clearSession(): void {
    localStorage.removeItem('auth_token');
    this.currentUserSubject.next(null);
  }

  /**
   * Logs out from the backend and clears client session.
   */
  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}).pipe(
      tap(() => this.clearSession()),
      catchError(err => {
        this.clearSession();
        return of(err);
      }),
    );
  }
}
