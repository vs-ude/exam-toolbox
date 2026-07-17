import { Inject, Injectable, DOCUMENT } from '@angular/core';

import { BehaviorSubject, Observable } from 'rxjs';

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
}

@Injectable({
  providedIn: 'root',
})
export class ThemeToggleService {
  private preference: Theme = Theme.AUTO;
  private themePreferenceSubject = new BehaviorSubject<Theme>(this.preference);
  public themePreference$: Observable<Theme>;

  private mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.themePreference$ = this.themePreferenceSubject.asObservable();
    this.mediaQuery.addEventListener('change', () => {
      if (this.preference === Theme.AUTO) {
        this.applySystemTheme();
      }
    });
    this.init();
  }

  private init() {
    this.applyPreference(Theme.AUTO);
  }

  private resolveSystemTheme(): Theme.LIGHT | Theme.DARK {
    return this.mediaQuery.matches ? Theme.DARK : Theme.LIGHT;
  }

  private applySystemTheme() {
    this.applyBodyClass(this.resolveSystemTheme());
  }

  private applyBodyClass(theme: Theme.LIGHT | Theme.DARK) {
    this.document.body.classList.remove(Theme.LIGHT, Theme.DARK);
    this.document.body.classList.add(theme);
  }

  private applyPreference(theme: Theme) {
    this.preference = theme;
    this.themePreferenceSubject.next(theme);

    if (theme === Theme.AUTO) {
      this.applySystemTheme();
    } else {
      this.applyBodyClass(theme);
    }
  }

  cycleTheme() {
    const themes = [Theme.LIGHT, Theme.DARK, Theme.AUTO];
    const currentIndex = themes.indexOf(this.preference);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    this.applyPreference(nextTheme);
  }
}
