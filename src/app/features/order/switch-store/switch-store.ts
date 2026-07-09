import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CustomerOrderResponse } from '../../../core/models/order/customer-order-response';
import { CustomerOrderService } from '../../../core/services/customer-order.service';
import { StoreService } from '../../../core/services/store.service';
import { ProductService } from '../../../core/services/product.service';
import { StoreResponse } from '../../../core/models/response/store-response';
import { ProductResponse } from '../../../core/models/response/product-response';
import { ReassignStoreRequest } from '../../../core/models/request/reassign-store-request';
import { CustomerOrderItemResponse } from '../../../core/models/order/customer-order-item-response';
import { City } from '../../../core/models/enums/city';


@Component({
  selector: 'app-switch-store',
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatTableModule,
    MatProgressBarModule,
    MatChipsModule,
  ],
  templateUrl: './switch-store.html',
  styleUrl: './switch-store.css',
})
export class SwitchStore implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(CustomerOrderService);
  private readonly storeService = inject(StoreService);
  private readonly productService = inject(ProductService);

  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private orderId!: number;

  // -- Stage 1: order context -------------------------------------------
  readonly order = signal<CustomerOrderResponse | null>(null);
  readonly loadingOrder = signal(false);
  readonly orderError = signal<string | null>(null);

  readonly orderItemColumns = ['product', 'shop', 'quantity', 'price', 'subtotal'];

  readonly orderSubtotal = computed(() =>
    (this.order()?.items ?? []).reduce((sum, item) => sum + item.price * item.quantity, 0),
  );

  // -- Stage 2: store selection ------------------------------------------
  readonly cityControl = new FormControl<City | ''>('', { nonNullable: true });
  readonly nameFilter = new FormControl('', { nonNullable: true });

  // Signal calculé pour la recherche par nom (filtre local)
  readonly filteredStores = computed(() => {
    const searchTerm = this.nameFilter.value.trim().toLowerCase();
    if (!searchTerm) return this.stores();
    return this.stores().filter(s => s.name.toLowerCase().includes(searchTerm));
  });

  readonly stores = signal<StoreResponse[]>([]);
  readonly storesLoading = signal(false);
  readonly storesError = signal<string | null>(null);
  readonly storesPage = signal(0);
  readonly storesHasMore = signal(false);
  private readonly storesPageSize = 20;

  readonly selectedStore = signal<StoreResponse | null>(null);

  // -- Stage 3: product mapping -------------------------------------------
  readonly productFilter = new FormControl('', { nonNullable: true });

  readonly products = signal<ProductResponse[]>([]);
  readonly productsLoading = signal(false);
  readonly productsError = signal<string | null>(null);
  readonly productsPage = signal(0);
  readonly productsHasMore = signal(false);
  private readonly productsPageSize = 20;

  readonly filteredProducts = computed(() => {
    const term = this.productFilter.value.trim().toLowerCase();
    const list = this.products();
    if (!term) return list;
    return list.filter((p) => p.name.toLowerCase().includes(term));
  });

  // itemId -> newProductId / itemId -> overridden price
  readonly itemProductMapping = signal<Map<number, number>>(new Map());
  readonly priceOverrides = signal<Map<number, number>>(new Map());

  readonly reasonControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.minLength(0)],
  });

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly isFullyMapped = computed(() => {
    const items = this.order()?.items ?? [];
    if (items.length === 0) return false;
    const mapping = this.itemProductMapping();
    return items.every((item) => mapping.has(item.id));
  });

  readonly canConfirm = computed(
    () =>
      !!this.selectedStore() &&
      this.isFullyMapped() &&
      this.reasonControl.valid &&
      !this.submitting(),
  );

  // Add these signals to your class properties
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);


  ngOnInit(): void {
    // 1. Initialisation des données de base
    const idParam = this.route.snapshot.paramMap.get('orderId');
    this.orderId = Number(idParam);

    if (!idParam || Number.isNaN(this.orderId)) {
      this.orderError.set('Missing or invalid order id in the route.');
      return;
    }

    this.fetchOrder();

    // 2. Gestion des filtres :
    // On appelle searchStores uniquement via les changements d'état
    this.cityControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.nameFilter.setValue(''); // Réinitialise la recherche locale si on change de ville
        this.searchStores(true);
      });

    // 3. Premier chargement
    this.searchStores(true);
  }

  // ---------------------------------------------------------------------
  // Stage 1 — order context
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
        },
        error: () => {
          this.orderError.set('Could not load this order. Please go back and try again.');
          this.loadingOrder.set(false);
        },
      });
  }

  // ---------------------------------------------------------------------
  // Stage 2 — store selection
  // ---------------------------------------------------------------------
  searchStores(reset: boolean): void {
    const page = reset ? 0 : this.storesPage() + 1;
    this.storesLoading.set(true);
    this.storesError.set(null);

    // On récupère la valeur du contrôle
    const cityValue = this.cityControl.value;
    // Si c'est vide, on passe undefined pour ne pas filtrer par ville
    const cityParam = cityValue !== '' ? (cityValue as City) : undefined;

    this.storeService
      .getStores(cityParam, page, this.storesPageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.stores.set(reset ? res.content : [...this.stores(), ...res.content]);
          this.storesPage.set(res.page);
          this.storesHasMore.set(!res.last);
          this.storesLoading.set(false);
        },
        error: () => {
          this.storesError.set('Could not load stores.');
          this.storesLoading.set(false);
        },
      });
  }

  loadMoreStores(): void {
    this.searchStores(false);
  }

  selectStore(store: StoreResponse): void {
    if (this.selectedStore()?.id === store.id) return;

    this.selectedStore.set(store);
    this.products.set([]);
    this.productsPage.set(0);
    this.productsHasMore.set(false);
    this.productFilter.setValue('');
    this.itemProductMapping.set(new Map());
    this.priceOverrides.set(new Map());

    this.fetchProducts(true);
  }

  changeStore(): void {
    this.selectedStore.set(null);
    this.products.set([]);
    this.itemProductMapping.set(new Map());
    this.priceOverrides.set(new Map());
  }

  // ---------------------------------------------------------------------
  // Stage 3 — product mapping
  // ---------------------------------------------------------------------
  private fetchProducts(reset: boolean): void {
    const store = this.selectedStore();
    if (!store) return;

    const page = reset ? 0 : this.productsPage() + 1;
    this.productsLoading.set(true);
    this.productsError.set(null);

    this.productService
      .getProductsByStore(store.id, page, this.productsPageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.products.set(reset ? res.content : [...this.products(), ...res.content]);
          this.productsPage.set(res.page);
          this.productsHasMore.set(!res.last);
          this.productsLoading.set(false);
        },
        error: (error) => {
          this.productsError.set('Could not load products for this store.');
          this.productsLoading.set(false);
          console.error('Error fetching products:', error);
        },
      });
  }

  loadMoreProducts(): void {
    this.fetchProducts(false);
  }

  /**
   * Called when the admin picks a replacement product for one original order
   * item (via the mat-select in a mapping row).
   *
   * This is the frontend's equivalent of the backend's reconciliation loop:
   * the backend only remaps an item if `item.id` is present as a key in
   * `itemProductMapping`, so recording the selection here is what makes that
   * item eligible for remapping once the request is submitted.
   */
  onProductSelected(item: CustomerOrderItemResponse, productId: number): void {
    const product = this.products().find((p) => p.id === productId);

    // Record item.id -> newProductId. Signals hold immutable values, so we
    // clone the Map rather than mutating it in place — mutating the same
    // Map instance wouldn't trigger change detection / computed() re-evals.
    this.itemProductMapping.update((map) => {
      const next = new Map(map);
      next.set(item.id, productId);
      return next;
    });

    // Auto-suggest the product's default price; the admin can still override it below.
    // This mirrors the backend's fallback: `manualPriceOverrides.getOrDefault(item.id, newProduct.getPrice())`.
    // We proactively seed that same default here so the price field never
    // starts empty, but it stays a plain, editable value the admin can change.
    if (product) {
      this.priceOverrides.update((map) => {
        const next = new Map(map);
        next.set(item.id, product.price);
        return next;
      });
    }
  }

  /**
   * Called on every keystroke in an item's price override input.
   * Keeps `priceOverrides` in sync with what will become
   * `ReassignStoreRequest.manualPriceOverrides` on submit.
   */
  onPriceOverrideChange(item: CustomerOrderItemResponse, value: string): void {
    const price = Number(value);
    this.priceOverrides.update((map) => {
      const next = new Map(map);
      if (Number.isNaN(price)) {
        // Empty/invalid input: drop the override for this item rather than
        // sending NaN. If a product is still mapped, the backend will fall
        // back to that product's own default price.
        next.delete(item.id);
      } else {
        next.set(item.id, price);
      }
      return next;
    });
  }

  /** Current mapped product id for a given original item, or null if unmapped yet. Drives the mat-select's [value] and the "fully mapped" check. */
  mappedProductId(item: CustomerOrderItemResponse): number | null {
    return this.itemProductMapping().get(item.id) ?? null;
  }

  /** Current price override for a given original item, or null if not set. Drives the price input's [value]. */
  overriddenPrice(item: CustomerOrderItemResponse): number | null {
    return this.priceOverrides().get(item.id) ?? null;
  }

  // ---------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------
  confirmReassignment(): void {
    const store = this.selectedStore();
    if (!store || !this.canConfirm()) return;

    const request: ReassignStoreRequest = {
      targetStoreId: store.id,
      itemProductMapping: Object.fromEntries(this.itemProductMapping()),
      manualPriceOverrides: Object.fromEntries(this.priceOverrides()),
      reason: this.reasonControl.value.trim(),
    };

    this.submitting.set(true);
    this.submitError.set(null);

    this.orderService
      .reassignOrderStore(this.orderId, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.snackBar.open('Order reassigned to the new store.', 'Close', { duration: 3000 });
          this.successMessage.set('Order successfully reassigned to the new store.');
          // this.router.navigate(['/admin/orders']);
        },
        error: (error) => {
          this.submitting.set(false);
          this.submitError.set(
            'The reassignment could not be completed. The order was left unchanged.',
          );
          console.log(error);
          this.errorMessage.set(error?.error?.message ?? 'Reassignment failed. Please try again.');

        },
      });
  }

  cancel(): void {
    this.router.navigate(['/admin/orders', this.orderId]);
  }

}
