import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiTestComponent } from './components/api-test/api-test.component';
import { LoginPageComponent } from './components/login-page/login-page.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ApiTestComponent, LoginPageComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'frontend';
}
