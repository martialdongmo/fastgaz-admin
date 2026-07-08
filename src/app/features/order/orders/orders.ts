import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';


import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { OrderStatus } from '../../../core/models/enums/order-status';
import { CustomerOrderService } from '../../../core/services/customer-order.service';
import { CustomerOrderResponse } from '../../../core/models/order/customer-order-response';
import { OrderFilters } from '../../../core/models/request/order-filters';


/** Simple label/value pair used to populate the status <mat-select>. */
interface StatusOption {
  value: OrderStatus;
  label: string;
}

/** Cash / online payment filter as a tri-state select (All / Cash / Online). */
type CashPaymentFilterValue = 'ALL' | 'CASH' | 'ONLINE';
@Component({
  selector: 'app-orders',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatCardModule,
  ],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders implements OnInit {

  private readonly orderService = inject(CustomerOrderService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // ---------------------------------------------------------------------
  // Table state
  // ---------------------------------------------------------------------
  readonly displayedColumns: string[] = [
    'invoiceNumber',
    'customer',
    'status',
    'financials',
    'payment',
    'distance',
    'actions',
  ];

  readonly orders = signal<CustomerOrderResponse[]>([]);
  readonly totalElements = signal(0);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 25, 50];

  readonly isEmpty = computed(
    () => !this.loading() && this.orders().length === 0,
  );

  // ---------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------
  readonly statusOptions: StatusOption[] = Object.values(OrderStatus).map(
    (value) => ({ value, label: this.formatStatusLabel(value) }),
  );

  readonly filterForm: FormGroup = this.fb.group({
    status: [null as OrderStatus | null],
    from: [null as Date | null],
    to: [null as Date | null],
    storeId: [null as number | null],
    city: [''],
    invoiceNumber: [''],
    cashPayment: ['ALL' as CashPaymentFilterValue],
  });

  readonly activeFilterCount = computed(() => {
    const v = this.filterFormValueSignal();
    let count = 0;
    if (v.status) count++;
    if (v.from) count++;
    if (v.to) count++;
    if (v.storeId) count++;
    if (v.city?.trim()) count++;
    if (v.invoiceNumber?.trim()) count++;
    if (v.cashPayment && v.cashPayment !== 'ALL') count++;
    return count;
  });

  // Mirrors filterForm.value as a signal so computed() can react to it.
  private readonly filterFormValueSignal = signal(this.filterForm.value);

  ngOnInit(): void {
    this.fetchOrders();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(
          (a, b) => JSON.stringify(a) === JSON.stringify(b),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.filterFormValueSignal.set(value);
        this.pageIndex.set(0);
        this.fetchOrders();
      });
  }

  // ---------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------
  fetchOrders(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const filters = this.buildFilters();

    this.orderService
      .getAllOrders(filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.orders.set(res.content);
          this.totalElements.set(res.totalElements);
          this.pageIndex.set(res.page);
          this.pageSize.set(res.size);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set(
            'We could not load the orders. Please try again.',
          );
          this.loading.set(false);
        },
      });
  }

  private buildFilters(): OrderFilters {
    const raw = this.filterForm.value;

    let cashPayment: boolean | undefined;
    if (raw.cashPayment === 'CASH') cashPayment = true;
    else if (raw.cashPayment === 'ONLINE') cashPayment = false;

    return {
      page: this.pageIndex(),
      size: this.pageSize(),
      status: raw.status ?? undefined,
      from: raw.from ? this.toIsoDate(raw.from) : undefined,
      to: raw.to ? this.toIsoDate(raw.to) : undefined,
      storeId: raw.storeId ?? undefined,
      city: raw.city?.trim() || undefined,
      invoiceNumber: raw.invoiceNumber?.trim() || undefined,
      cashPayment,
    };
  }

  private toIsoDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.fetchOrders();
  }

  resetFilters(): void {
    this.filterForm.reset({
      status: null,
      from: null,
      to: null,
      storeId: null,
      city: '',
      invoiceNumber: '',
      cashPayment: 'ALL',
    });
    this.filterFormValueSignal.set(this.filterForm.value);
    this.pageIndex.set(0);
    this.fetchOrders();
  }

  // ---------------------------------------------------------------------
  // Row actions — this list stays "dumb": every action just routes to its
  // own feature component (matches the /admin/orders/:orderId/... routes),
  // which owns the actual request, form, and success/error handling.
  // ---------------------------------------------------------------------
  viewOrder(order: CustomerOrderResponse): void {
    this.router.navigate(['/admin/orders', order.id]);
  }

  goToUpdatePrice(order: CustomerOrderResponse): void {
    this.router.navigate(['/admin/orders', order.id, 'update-price']);
  }

  goToSwitchStore(order: CustomerOrderResponse): void {
    this.router.navigate(['/admin/orders', order.id, 'switch-store']);
  }

  goToAssignDriver(order: CustomerOrderResponse): void {
    this.router.navigate(['/admin/orders', order.id, 'assign-driver']);
  }

  // ---------------------------------------------------------------------
  // Presentation helpers
  // ---------------------------------------------------------------------
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
