import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CustomerOrderService } from '../../../core/services/customer-order.service';
import { CustomerOrderResponse } from '../../../core/models/order/customer-order-response';
import { OrderStatus } from '../../../core/models/enums/order-status';

// Terminal statuses: nothing about the order can be changed from here anymore.
const TERMINAL_STATUSES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
  OrderStatus.REJECTED,
]);

// Mirrors the backend's status guard in switchOrderToAnotherStore(): only
// these statuses are accepted for a store reassignment.
const SWITCH_STORE_STATUSES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.AWAITING_CASH,
  OrderStatus.VALIDATED,
  OrderStatus.INDELIVERY,
  OrderStatus.PENDING,
    OrderStatus.FAILED,

]);

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTableModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
  ],
  templateUrl: './order-details.html',
  styleUrl: './order-details.css',
})
export class OrderDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(CustomerOrderService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private orderId!: number;

  readonly order = signal<CustomerOrderResponse | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly itemColumns = ['product', 'shop', 'quantity', 'price', 'subtotal'];

  readonly orderSubtotal = computed(() =>
    (this.order()?.items ?? []).reduce((sum, item) => sum + item.price * item.quantity, 0),
  );

  // -- Guards driving which actions are enabled ---------------------------
  readonly isTerminal = computed(() => {
    const status = this.order()?.orderStatus;
    return !!status && TERMINAL_STATUSES.has(status);
  });

  readonly canUpdatePrice = computed(() => !!this.order() && !this.isTerminal());

  readonly canSwitchStore = computed(() => {
    const status = this.order()?.orderStatus;
    return !!status && SWITCH_STORE_STATUSES.has(status);
  });

  readonly canAssignDriver = computed(() => {
    const status = this.order()?.orderStatus;
    return !!status && status !== OrderStatus.INDELIVERY && !this.isTerminal();
  });

  readonly canCancel = computed(() => !!this.order() && !this.isTerminal());

  // -- Cancel order (inline reason form, no separate route) ---------------
  readonly showCancelForm = signal(false);
  readonly cancelReason = signal('');
  readonly cancelling = signal(false);
  readonly cancelError = signal<string | null>(null);

  readonly canConfirmCancel = computed(
    () => !this.cancelling() && this.cancelReason().trim().length >= 5,
  );

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('orderId');
    this.orderId = Number(idParam);

    if (!idParam || Number.isNaN(this.orderId)) {
      this.errorMessage.set('Missing or invalid order id in the route.');
      return;
    }

    this.fetchOrder();
  }

  private fetchOrder(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.orderService
      .getOrderById(this.orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.order.set(order);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Could not load this order. Please go back and try again.');
          this.loading.set(false);
        },
      });
  }

  // ---------------------------------------------------------------------
  // Navigation to the other three action pages — relative to this route,
  // matching the ':orderId/switch-store' etc. children in the router config.
  // ---------------------------------------------------------------------
  goToUpdatePrice(): void {
    this.router.navigate(['update-price'], { relativeTo: this.route });
  }

  goToSwitchStore(): void {
    this.router.navigate(['switch-store'], { relativeTo: this.route });
  }

  goToAssignDriver(): void {
    this.router.navigate(['assign-driver'], { relativeTo: this.route });
  }

  goToOrdersList(): void {
    this.router.navigate(['/admin/orders']);
  }

  // ---------------------------------------------------------------------
  // Cancel order
  // ---------------------------------------------------------------------
  openCancelForm(): void {
    this.cancelReason.set('');
    this.cancelError.set(null);
    this.showCancelForm.set(true);
  }

  closeCancelForm(): void {
    this.showCancelForm.set(false);
  }

  confirmCancel(): void {
    if (!this.canConfirmCancel()) return;

    this.cancelling.set(true);
    this.cancelError.set(null);

    this.orderService
      .cancelOrder(this.orderId, this.cancelReason().trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cancelling.set(false);
          this.showCancelForm.set(false);
          this.snackBar.open('Order cancelled.', 'Close', { duration: 3000 });
          this.fetchOrder(); // Refresh so the status chip/guards reflect CANCELLED
        },
        error: (err) => {
          this.cancelling.set(false);
          this.cancelError.set(err?.error?.message ?? 'Could not cancel this order.');
        },
      });
  }

  formatStatusLabel(status: string): string {
    return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
  }

  statusColor(status: OrderStatus): 'primary' | 'accent' | 'warn' {
    switch (status) {
      case OrderStatus.COMPLETED:
      case OrderStatus.PAID:
      case OrderStatus.VALIDATED:
        return 'primary';
      case OrderStatus.REJECTED:
      case OrderStatus.CANCELLED:
      case OrderStatus.FAILED:
        return 'warn';
      default:
        return 'accent';
    }
  }
}