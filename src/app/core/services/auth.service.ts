import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { TokenService } from '../token/token.service';
import { AuthRequest } from '../models/request/auth-request';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthResponse } from '../models/response/auth-response';
import { AdminUserResponse } from '../models/response/admin-user-response';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private readonly baseUrl = environment.apiUrl;

  private http = inject(HttpClient);
  private tokenService = inject(TokenService);

  authenticate(request: AuthRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, request).pipe(
      tap((response: AuthResponse) => {
        // Save the token to local storage via TokenService
        this.tokenService.token = response.token;
      })
    );
  }


  me(): Observable<AdminUserResponse> {
    return this.http.get<AdminUserResponse>(`${this.baseUrl}/admin/users/me`).pipe(
      tap(response => console.log('Response from /me:', response))
    );
  }

  logout(): void {
    this.tokenService.clearToken();
    // Redirect logic would go here
  };


}
