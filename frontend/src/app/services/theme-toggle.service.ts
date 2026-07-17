import { Inject, Injectable, DOCUMENT } from '@angular/core';

import { BehaviorSubject, Observable } from 'rxjs';

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

@Injectable({
  providedIn: 'root',
})
export class ThemeToggleService {
  private currentTheme: Theme = Theme.LIGHT;
  private themeChangedSubject = new BehaviorSubject<Theme>(this.currentTheme);
  public themeChanged$: Observable<Theme>;

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.themeChanged$ = this.themeChangedSubject.asObservable();
    this.init();
  }

  private init() {
    const deviceMode = window.matchMedia('(prefers-color-scheme: dark)');
    let initialTheme = deviceMode.matches ? Theme.DARK : Theme.LIGHT;
    this.updateCurrentTheme(initialTheme);
    this.document.body.classList.add(this.currentTheme);
  }

  private updateCurrentTheme(theme: Theme) {
    this.currentTheme = theme;
    this.themeChangedSubject.next(this.currentTheme);
  }

  toggleTheme() {
    this.document.body.classList.toggle(Theme.LIGHT);
    this.document.body.classList.toggle(Theme.DARK);
    if (this.currentTheme === Theme.LIGHT) {
      this.updateCurrentTheme(Theme.DARK);
    } else {
      this.updateCurrentTheme(Theme.LIGHT);
    }
  }
}
