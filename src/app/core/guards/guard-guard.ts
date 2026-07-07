import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { TokenService } from '../token/token.service';

export const authGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  // Check if token exists and is valid
  if (tokenService.isTokenValid()) {
    return true;
  }

  // If not valid, clear session and redirect to login
  tokenService.clearToken();
  router.navigate(['/login']);
  return false;
};