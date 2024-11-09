import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [MatIconModule,],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss'
})
export class LoginPageComponent {

  usernameValid = true;
  passwordValid = true;

  constructor(
    private authService: AuthService
  ) { }

  login(userName: string, password: string) {

    console.log(`username: "${userName}", password: "${password}"`)

    this.usernameValid = userName !== "";
    this.passwordValid = password !== "";

    if (!this.usernameValid || !this.passwordValid) { return; }

    this.authService.authUser();

  }

}
