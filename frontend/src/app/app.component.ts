import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiTestComponent } from './components/api-test/api-test.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ApiTestComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'frontend';
}
