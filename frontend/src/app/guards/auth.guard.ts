import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  return authService.validateSession().pipe(
    map(isValid => {
      if (isValid) {
        return true;
      } else {
        router.navigate(['/login']);
        return false;
      }
    }),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    }),
  );
};
