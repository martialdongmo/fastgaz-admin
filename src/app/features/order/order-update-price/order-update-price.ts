import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CustomerOrderService } from '../../../core/services/customer-order.service';
import { UpdateOrderPriceRequest } from '../../../core/models/request/update-order-price-request';
import { CustomerOrderResponse } from '../../../core/models/order/customer-order-response';
import { OrderStatus } from '../../../core/models/enums/order-status';

interface StatusOption {
  value: OrderStatus;
  label: string;
}

@Component({
  selector: 'app-order-update-price',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './order-update-price.html',
  styleUrl: './order-update-price.css',
})
export class OrderUpdatePrice implements OnInit {
  private readonly orderService = inject(CustomerOrderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // State
  readonly orderId = signal<number>(0);
  readonly order = signal<CustomerOrderResponse | null>(null);
  readonly loading = signal(false);

  // Feedback Signals
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  // -----------------------------------------------------------------------
  // Form state — UpdateOrderPriceRequest is order-level (newPrice/deliveryFee/
  // newTotal/updateReason), not per-item, so there's one price field for the
  // whole order rather than a row per item. Seeded from the order once it
  // loads; only calls into your existing updatePrice()/updateStatus() below.
  // -----------------------------------------------------------------------

  readonly newPriceInput = signal<number | null>(null);
  readonly deliveryFeeInput = signal<number | null>(null);
  readonly updateReason = signal('');

  // newTotal is a required field on the request, but it's just the sum of
  // the two inputs above — computed, not separately editable, so it can
  // never drift out of sync with what the admin actually typed.
  readonly newTotal = computed(() => (this.newPriceInput() ?? 0) + (this.deliveryFeeInput() ?? 0));

  readonly canSubmitPrice = computed(
    () =>
      !this.loading() &&
      this.newPriceInput() !== null &&
      this.deliveryFeeInput() !== null &&
      this.updateReason().trim().length >= 5,
  );

  readonly statusOptions: StatusOption[] = Object.values(OrderStatus).map((value) => ({
    value,
    label: this.formatStatusLabel(value),
  }));

  readonly selectedStatus = signal<OrderStatus | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('orderId'));
    if (!Number.isNaN(id)) {
      this.orderId.set(id);
      this.fetchOrder(id);
    }
  }

  private fetchOrder(id: number): void {
    this.orderService.getOrderById(id).subscribe({
      next: (data) => {
        this.order.set(data);
        this.seedFormState(data);
      },
      error: () => this.errorMessage.set('Failed to load order details.'),
    });
  }

  // Pre-fills the price/fee inputs with the order's current values. Called on
  // initial load and again after a successful update (fetchOrder refreshes
  // `order`), so the form always reflects what the backend just saved.
  private seedFormState(order: CustomerOrderResponse): void {
    this.newPriceInput.set(order.amount);
    this.deliveryFeeInput.set(order.deliveryFee);
  }

  onNewPriceChange(value: string): void {
    const price = Number(value);
    this.newPriceInput.set(Number.isNaN(price) ? null : price);
  }

  onDeliveryFeeChange(value: string): void {
    const fee = Number(value);
    this.deliveryFeeInput.set(Number.isNaN(fee) ? null : fee);
  }

  // Builds the request from current form state and hands off to your
  // existing updatePrice() method.
  submitPriceUpdate(): void {
    if (!this.canSubmitPrice()) return;

    const request: UpdateOrderPriceRequest = {
      newPrice: this.newPriceInput() ?? 0,
      newTotal: this.newTotal(),
      deliveryFee: this.deliveryFeeInput() ?? 0,
      updateReason: this.updateReason().trim(),
    };

    this.updatePrice(request);
  }

  // Hands off to your existing updateStatus() method.
  submitStatusChange(): void {
    const status = this.selectedStatus();
    if (!status) return;
    this.updateStatus(status);
  }

  // PATCH: Update Price
  updatePrice(request: UpdateOrderPriceRequest): void {
    this.loading.set(true);
    this.clearMessages();
    this.orderService.updateOrderPrice(this.orderId(), request).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMessage.set('Price updated successfully.');
        this.fetchOrder(this.orderId()); // Refresh data
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Failed to update price.');
      },
    });
  }

  // PATCH: Update Status
  updateStatus(status: string): void {
    this.loading.set(true);
    this.clearMessages();
    this.orderService.updateOrderStatus(this.orderId(), status).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMessage.set(`Order status changed to ${status}.`);
        this.fetchOrder(this.orderId()); // Refresh data
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Failed to update status.');
      },
    });
  }

  private clearMessages(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  private formatStatusLabel(status: string): string {
    return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
  }

  goBack(): void {
    this.router.navigate(['/admin/orders', this.orderId()]);
  }
}