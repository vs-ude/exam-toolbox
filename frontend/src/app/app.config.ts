import {
  ApplicationConfig,
  ENVIRONMENT_INITIALIZER,
  inject,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatIconRegistry } from '@angular/material/icon';

import { ApiService } from './services/api.service';
import { authInterceptor } from './interceptors/auth.interceptor';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withHashLocation()),
    provideHttpClient(withInterceptors([authInterceptor])),
    ApiService,
    provideAnimationsAsync(),
    {
      provide: ENVIRONMENT_INITIALIZER,
      useValue: () =>
        inject(MatIconRegistry).setDefaultFontSetClass(
          'material-symbols-outlined',
        ),
      multi: true,
    },
    provideNativeDateAdapter(),
  ],
};
