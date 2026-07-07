import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly tokenKey: string = 'FAST_GAZ_ADMIN_TOKEN';
  private readonly jwtHelper = new JwtHelperService();

  set token(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  clearToken(): void {
    localStorage.removeItem(this.tokenKey);
  }

  isTokenValid(): boolean {
    const token = this.token;
    if (!token) return false;

    if (this.jwtHelper.isTokenExpired(token)) {
      this.clearToken();
      return false;
    }
    return true;
  }

  get userRoles(): string[] {
    const token = this.token;
    if (token && !this.jwtHelper.isTokenExpired(token)) {
      const decodedToken = this.jwtHelper.decodeToken(token);
      return decodedToken.authorities || [];
    }
    return [];
  }

  get userEmail(): string | null {
    const token = this.token;
    if (token) {
      return this.jwtHelper.decodeToken(token).sub;
    }
    return null;
  }
}