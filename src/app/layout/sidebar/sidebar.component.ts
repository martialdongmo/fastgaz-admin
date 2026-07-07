import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { RouterModule, Router, NavigationEnd, RouterOutlet, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, shareReplay, filter } from 'rxjs/operators';


import { AsyncPipe } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AdminUserResponse } from '../../core/models/response/admin-user-response';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  imports: [
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    AsyncPipe,
    RouterOutlet
]
})
export class SidebarComponent implements OnInit {
  private breakpointObserver = inject(BreakpointObserver);

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  // Active User Profile Context Tracking Signal
  readonly adminUser = signal<AdminUserResponse | null>(null);
  readonly currentUrl = signal<string>('');

  readonly navigationMenu = signal<NavItem[]>([
    { path: '/admin/dashboard/operational', label: 'Operational Control', icon: 'dashboard' },
    { path: '/admin/dashboard/analytics', label: 'Analytics Platform', icon: 'analytics' },
    { path: '/admin/orders', label: 'Orders Registry', icon: 'shopping_bag' },
  ]);

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );


    constructor() {
    // 1. URL Tracking
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed()
    ).subscribe(event => this.currentUrl.set(event.urlAfterRedirects));

    // 2. User Profile Loading
    this.authService.me().pipe(
      takeUntilDestroyed()
    ).subscribe({
      next: (profile) => this.adminUser.set(profile),
      error: (err) => console.error('Failed to load profile:', err)
    });
  }

  ngOnInit(): void {
    // Fetch the current user profile on component initialization
    this.authService.me().subscribe({
      next: (user) => this.adminUser.set(user),
      error: (err) => console.error('Failed to fetch user profile:', err)
    });

    // Track the current URL for active menu highlighting
    this.router.events.subscribe(() => {
      this.currentUrl.set(this.router.url);
    });
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
