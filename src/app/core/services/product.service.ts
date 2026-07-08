import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment.development';
import { PageResponse } from '../models/response/page-response';
import { ProductResponse } from '../models/response/product-response';


@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly baseUrl = environment.apiUrl + "/admin/product";

  private http = inject(HttpClient);

  getProductsByStore(
    storeId: number,
    page: number = 0,
    size: number = 10
  ): Observable<PageResponse<ProductResponse>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());



    return this.http.get<PageResponse<ProductResponse>>(`${this.baseUrl}/${storeId}/products`, { params }).pipe(
      tap(response => console.log('Products response:', response))
    );
  }

}
