import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment.development';
import { PageResponse } from '../models/response/page-response';
import { DeliveryResponse } from '../models/response/delivery-response';
@Injectable({
  providedIn: 'root',
})
export class DeliveryService {

  private readonly baseUrl = environment.apiUrl + "/admin/delivery";

  private http = inject(HttpClient);

  getAllDeliveries(
    storeId: number,
    page: number = 0,
    size: number = 10
  ): Observable<PageResponse<DeliveryResponse>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PageResponse<DeliveryResponse>>(`${this.baseUrl}/${storeId}`, { params }).pipe(
      tap(response => console.log('Deliveries response:', response))
    );
  }

}
