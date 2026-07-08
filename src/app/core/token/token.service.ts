import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';

interface DecodedToken {
  sub: string;
  authorities?: string[];
  exp: number;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly tokenKey = 'FAST_GAZ_ADMIN_TOKEN';
  private readonly jwtHelper = new JwtHelperService();

  set token(token: string | null) {
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    } else {
      localStorage.removeItem(this.tokenKey);
    }
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

    try {
      if (this.jwtHelper.isTokenExpired(token)) {
        this.clearToken();
        return false;
      }
      return true;
    } catch {
      // token malformé
      this.clearToken();
      return false;
    }
  }

  private decode(): DecodedToken | null {
    const token = this.token;
    if (!token) return null;
    try {
      return this.jwtHelper.decodeToken(token);
    } catch {
      return null;
    }
  }

  get userRoles(): string[] {
    if (!this.isTokenValid()) return [];
    return this.decode()?.authorities ?? [];
  }

  get userEmail(): string | null {
    if (!this.isTokenValid()) return null;
    return this.decode()?.sub ?? null;
  }
}