import { OrderStatus } from "../enums/order-status";

export interface OrderFilters {
  page?: number;
  size?: number;
  status?: OrderStatus;
  from?: string; // ISO Date string
  to?: string;   // ISO Date string
  storeId?: number;
  city?: string;
  invoiceNumber?: string;
  cashPayment?: boolean;
}