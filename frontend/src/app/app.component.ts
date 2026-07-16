import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MainViewComponent } from './components/main-view/main-view.component';
import { LoadingIndicatorComponent } from './components/loading-indicator/loading-indicator.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MainViewComponent, LoadingIndicatorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  isLoggedIn = false;

  constructor() {}

  ngOnInit(): void {}
}
