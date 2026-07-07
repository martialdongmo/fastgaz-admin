import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { TokenService } from '../token/token.service';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const token = tokenService.token;

  // Clone the request and add the authorization header
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((err) => {
      // If unauthorized, attempt to clear tokens and redirect to login
      if (err.status === 401) {
        tokenService.clearToken();
        // Redirect logic here, e.g., using Router
        window.location.href = '/login';
      }
      return throwError(() => err);
    })
  );
};