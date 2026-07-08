import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment.development';
import { PageResponse } from '../models/response/page-response';
import { StoreResponse } from '../models/response/store-response';
import { City } from '../models/enums/city';

@Injectable({
  providedIn: 'root',
})
export class StoreService {

  private readonly baseUrl = environment.apiUrl + "/admin/store";

  private http = inject(HttpClient);

  getStores(city?: City, page: number = 0, size: number = 10): Observable<PageResponse<StoreResponse>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (city) {
      params = params.set('city', city);
    }


    return this.http.get<PageResponse<StoreResponse>>(`${this.baseUrl}`, { params }).pipe(
      tap(response => console.log('Stores response:', response))
    );
  }


}
