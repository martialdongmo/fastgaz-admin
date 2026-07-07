import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment.development';
import { OrderFilters } from '../models/request/order-filters';
import { PageResponse } from '../models/response/page-response';
import { CustomerOrderResponse } from '../models/order/customer-order-response';
import { UpdateOrderPriceRequest } from '../models/request/update-order-price-request';
import { ReassignStoreRequest } from '../models/request/reassign-store-request';
import { AssignDriverRequest } from '../models/request/assign-driver-request';

@Injectable({
  providedIn: 'root',
})
export class CustomerOrderService {
  private readonly baseUrl = environment.apiUrl + "/admin/orders";

  private http = inject(HttpClient);


  getAllOrders(filters: OrderFilters): Observable<PageResponse<CustomerOrderResponse>> {
    // 1. Initialize with mandatory/default pagination
    let params = new HttpParams()
      .set('page', (filters.page ?? 0).toString())
      .set('size', (filters.size ?? 10).toString());

    // 2. Add only the filters present in your Java @RestController
    if (filters.status) params = params.set('status', filters.status);
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    if (filters.storeId) params = params.set('storeId', filters.storeId.toString());
    if (filters.city) params = params.set('city', filters.city);
    if (filters.invoiceNumber) params = params.set('invoiceNumber', filters.invoiceNumber);

    if (filters.cashPayment !== undefined && filters.cashPayment !== null) {
      params = params.set('cashPayment', filters.cashPayment.toString());
    }

    // 3. Execution
    return this.http.get<PageResponse<CustomerOrderResponse>>(this.baseUrl, { params })
      .pipe(
        tap({
          next: (res) => console.log('Orders fetched successfully:', res),
          error: (err) => console.error('Error fetching orders:', err)
        })
      );
  }

  // Get a single order by ID
  getOrderById(orderId: number): Observable<CustomerOrderResponse> {
    return this.http.get<CustomerOrderResponse>(`${this.baseUrl}/${orderId}`)
      .pipe(tap(res => console.log(`Order ${orderId} retrieved:`, res)));
  }

  // Patch: Update status
  updateOrderStatus(orderId: number, status: string): Observable<void> {
    const params = new HttpParams().set('status', status);
    return this.http.patch<void>(`${this.baseUrl}/${orderId}/status`, null, { params })
      .pipe(tap(() => console.log(`Status updated to ${status} for order ${orderId}`)));
  }

  // Patch: Update price details
  updateOrderPrice(orderId: number, request: UpdateOrderPriceRequest): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${orderId}/price`, request)
      .pipe(tap(() => console.log(`Price updated for order ${orderId}`)));
  }

  // Patch: Switch store
  reassignOrderStore(orderId: number, request: ReassignStoreRequest): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${orderId}/reassign`, request)
      .pipe(tap(() => console.log(`Store reassigned for order ${orderId}`)));
  }

  // Post: Cancel order
  cancelOrder(orderId: number, reason: string): Observable<void> {
    // Note: If the backend expects a raw string, use { responseType: 'text' } if needed
    return this.http.post<void>(`${this.baseUrl}/${orderId}/cancel`, reason)
      .pipe(tap(() => console.log(`Order ${orderId} cancelled. Reason: ${reason}`)));
  }

  // Post: Assign driver
  assignDriver(orderId: number, request: AssignDriverRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${orderId}/assign-driver`, request)
      .pipe(tap(() => console.log(`Driver assigned to order ${orderId}`)));
  }

}
