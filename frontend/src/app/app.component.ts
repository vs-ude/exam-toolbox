import { Component, ChangeDetectionStrategy } from '@angular/core';

import { MainViewComponent } from './components/main-view/main-view.component';
import { LoadingIndicatorComponent } from './components/loading-indicator/loading-indicator.component';

@Component({
  selector: 'app-root',
  imports: [MainViewComponent, LoadingIndicatorComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.component.scss',
})
export class AppComponent {
  isLoggedIn = false;

  constructor() {}

  ngOnInit(): void {}
}
