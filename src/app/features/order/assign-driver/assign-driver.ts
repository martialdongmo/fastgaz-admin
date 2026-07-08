import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
 
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DeliveryResponse } from '../../../core/models/response/delivery-response';
import { AssignDriverRequest } from '../../../core/models/request/assign-driver-request';
import { CustomerOrderService } from '../../../core/services/customer-order.service';
import { DeliveryService } from '../../../core/services/delivery.service';
import { CustomerOrderResponse } from '../../../core/models/order/customer-order-response';
import { OrderStatus } from '../../../core/models/enums/order-status';
 

@Component({
  selector: 'app-assign-driver',
 imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatProgressBarModule,
    MatChipsModule,
       MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './assign-driver.html',
  styleUrl: './assign-driver.css',
})
export class AssignDriver implements OnInit {
 private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(CustomerOrderService);
  private readonly deliveryService = inject(DeliveryService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
 
  private orderId!: number;
 
  // -- Stage 1: context ---------------------------------------------------
  readonly order = signal<CustomerOrderResponse | null>(null);
  readonly loadingOrder = signal(false);
  readonly orderError = signal<string | null>(null);
 
  // Safety guard: an order already being delivered must not be re-dispatched.
  // We disable the whole selection UI rather than just the submit button, so
  // it's obvious at a glance why nothing is clickable.
  readonly alreadyInDelivery = computed(() => this.order()?.orderStatus === OrderStatus.INDELIVERY);
 
  // -- Stage 2: discovery (deliveries scoped to the order's store) --------
  readonly deliveries = signal<DeliveryResponse[]>([]);
  readonly deliveriesLoading = signal(false);
  readonly deliveriesError = signal<string | null>(null);
  readonly deliveriesPage = signal(0);
  readonly deliveriesHasMore = signal(false);
  private readonly deliveriesPageSize = 10;
 
  // Extra client-side safety net on top of whatever the backend returns —
  // only ever show drivers that aren't currently busy on another delivery,
  // further narrowed by the name search below.
  // NOTE: DeliveryResponse has no email field, so this only matches driverName.
  // A plain signal (not a FormControl) so `computed()` actually reacts to it —
  // computed() only re-runs off signal reads, not FormControl.valueChanges.
  readonly driverSearch = signal('');
 
  readonly availableDeliveries = computed(() => {
    const term = this.driverSearch().trim().toLowerCase();
    return this.deliveries().filter(
      (d) => !d.busy && (!term || d.driverName.toLowerCase().includes(term)),
    );
  });
 
  readonly selectedDelivery = signal<DeliveryResponse | null>(null);
 
  // -- Stage 3: dispatch ---------------------------------------------------
  readonly submitting = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
 
  // Set once the dispatch call succeeds. We don't auto-redirect afterwards
  // (the admin navigates back manually), so this flag is what disables the
  // driver list / confirm button instead of relying on order().orderStatus,
  // which we never refetch after a successful assignment.
  readonly dispatched = signal(false);
 
  readonly canConfirm = computed(
    () =>
      !!this.selectedDelivery() &&
      !this.alreadyInDelivery() &&
      !this.dispatched() &&
      !this.submitting(),
  );
 
  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('orderId');
    this.orderId = Number(idParam);
 
    if (!idParam || Number.isNaN(this.orderId)) {
      this.orderError.set('Missing or invalid order id in the route.');
      return;
    }
 
    this.fetchOrder();
  }
 
  // ---------------------------------------------------------------------
  // Stage 1 — load the order, then chain into Stage 2 once we know the store
  // ---------------------------------------------------------------------
  private fetchOrder(): void {
    this.loadingOrder.set(true);
    this.orderError.set(null);
 
    this.orderService
      .getOrderById(this.orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.order.set(order);
          this.loadingOrder.set(false);
 
          // Only bother fetching drivers if this order can actually still be
          // dispatched — no point discovering drivers for a locked order.
          if (order.orderStatus !== OrderStatus.INDELIVERY) {
            this.fetchDeliveries(order.storeId, true);
          }
        },
        error: () => {
          this.orderError.set('Could not load this order. Please go back and try again.');
          this.loadingOrder.set(false);
        },
      });
  }
 
  // ---------------------------------------------------------------------
  // Stage 2 — deliveries available for the order's store
  // ---------------------------------------------------------------------
  private fetchDeliveries(storeId: number, reset: boolean): void {
    const page = reset ? 0 : this.deliveriesPage() + 1;
    this.deliveriesLoading.set(true);
    this.deliveriesError.set(null);
 
    this.deliveryService
      .getAllDeliveries(storeId, page, this.deliveriesPageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.deliveries.set(reset ? res.content : [...this.deliveries(), ...res.content]);
          this.deliveriesPage.set(res.page);
          this.deliveriesHasMore.set(!res.last);
          this.deliveriesLoading.set(false);
        },
        error: () => {
          this.deliveriesError.set('Could not load available drivers for this store.');
          this.deliveriesLoading.set(false);
        },
      });
  }
 
  loadMoreDeliveries(): void {
    const storeId = this.order()?.storeId;
    if (storeId == null) return;
    this.fetchDeliveries(storeId, false);
  }
 
  selectDelivery(delivery: DeliveryResponse): void {
    if (this.alreadyInDelivery()) return;
    this.selectedDelivery.set(delivery);
  }
 
  // ---------------------------------------------------------------------
  // Stage 3 — dispatch
  // ---------------------------------------------------------------------
  confirmAssignment(): void {
    const delivery = this.selectedDelivery();
    if (!delivery || !this.canConfirm()) return;
 
    const request: AssignDriverRequest = { deliveryId: delivery.id };
 
    this.submitting.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);
 
    this.orderService
      .assignDriver(this.orderId, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Backend responds 204 No Content on success — nothing to read,
          // just acknowledge. Don't try to reuse this deliveryId again: the
          // backend has already flagged it "busy". We intentionally do NOT
          // navigate away here — the admin decides when to go back, via the
          // "Back to order" button below.
          this.submitting.set(false);
          this.dispatched.set(true);
          this.successMessage.set(
            `Driver ${delivery.driverName} was dispatched for order ${this.order()?.invoiceNumber}.`,
          );
          this.snackBar.open('Driver dispatched.', 'Close', { duration: 3000 });
        },
        error: (err) => {
          this.submitting.set(false);
          // The backend throws IllegalStateException (order already assigned,
          // wrong status, etc.) — surface its message when the API forwards
          // one, otherwise fall back to a generic explanation.
          const backendMessage = err?.error?.message;
          this.errorMessage.set(
            backendMessage ?? 'This order could not be dispatched. It may already have a driver assigned.',
          );
        },
      });
  }
 
  cancel(): void {
    this.router.navigate(['/admin/orders', this.orderId]);
  }
}
