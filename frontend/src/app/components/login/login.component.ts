import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { COMMON_IMPORTS } from '../common-imports';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    ...COMMON_IMPORTS,
    MatFormFieldModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  username = '';
  password = '';
  error = '';
  isLoading = false;
  private _snackBar: MatSnackBar = inject(MatSnackBar);

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {
    // If already authenticated, redirect to dashboard
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    if (!this.username.trim() || !this.password.trim()) {
      this.error = 'Please enter both username and password.';
      return;
    }

    this.isLoading = true;
    this.error = '';

    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        this.isLoading = false;
        let text = '';
        if (err.status === 401) {
          text = 'Invalid username or password.';
        } else if (err.status === 403) {
          text = 'You do not have permission to access this application.';
        } else {
          text = 'An unexpected error occurred. Please try again later.';
        }
        this._snackBar.open(text, 'Close', { duration: 10000 });
      },
    });
  }
}
