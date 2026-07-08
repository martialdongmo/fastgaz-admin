import { Routes } from '@angular/router';
import { Login } from './core/auth/login/login';
import { authGuard } from './core/guards/guard-guard';
import { PageNotFound } from './page.not.found/page.not.found';
import { OrderDetails } from './features/order/order-details/order-details';
import { SwitchStore } from './features/order/switch-store/switch-store';
import { AssignDriver } from './features/order/assign-driver/assign-driver';
import { OrderUpdatePrice } from './features/order/order-update-price/order-update-price';

export const routes: Routes = [
    { path: 'login', component: Login },

    {
        path: 'admin',
        canActivate: [authGuard],
        loadComponent: () => import('./layout/sidebar/sidebar.component').then(m => m.SidebarComponent),
        children: [
            { path: '', redirectTo: 'dashboard/operational', pathMatch: 'full' },
            {
                path: 'dashboard',
                children: [
                    { path: 'operational', loadComponent: () => import('./features/dashboard/operational/operational-dashboard/operational-dashboard').then(m => m.OperationalDashboard) },
                    { path: 'analytics', loadComponent: () => import('./features/dashboard/analytics/analytics-dashboard/analytics-dashboard').then(m => m.AnalyticsDashboard) }
                ]
            },
            {
                path: 'orders',
                children: [
                    { path: '', loadComponent: () => import('./features/order/orders/orders').then(m => m.Orders) },
                    {
                        path: ':orderId',
                        children: [
                            { path: '', component: OrderDetails }, // The main detail view
                            { path: 'switch-store', component: SwitchStore },
                            { path: 'assign-driver', component: AssignDriver },
                            { path: 'update-price', component: OrderUpdatePrice }
                        ]
                    }
                ]
            },


        ]
    },
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: '**', component: PageNotFound }
];
