import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment.development';
import { TokenService } from '../token/token.service';
import { AuthRequest } from '../models/request/auth-request';
import { AuthResponse } from '../models/response/auth-response';
import { AdminUserResponse } from '../models/response/admin-user-response';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = environment.apiUrl;

  private http = inject(HttpClient);
  private tokenService = inject(TokenService);

  // Source de vérité unique pour l'utilisateur connecté
  private readonly currentUserSubject = new BehaviorSubject<AdminUserResponse | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  get currentUser(): AdminUserResponse | null {
    return this.currentUserSubject.value;
  }

  authenticate(request: AuthRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, request).pipe(
      tap((response: AuthResponse) => {
        this.tokenService.token = response.token;
      }),
      catchError((err) => throwError(() => err))
    );
  }

  me(): Observable<AdminUserResponse> {
    return this.http.get<AdminUserResponse>(`${this.baseUrl}/admin/users/me`).pipe(
      tap((user) => this.currentUserSubject.next(user)),
      catchError((err) => {
        this.currentUserSubject.next(null);
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    this.tokenService.clearToken();
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return this.tokenService.isTokenValid();
  }
}