import { OrderStatus } from '../enums/order-status';
import { CustomerOrderItemResponse } from './customer-order-item-response';

export interface CustomerOrderResponse {
  // Basic Info
  id: number;                // Long → number
  transactionId: string;
  invoiceNumber: string;
  qrcode: string;

  // Status & Financials
  orderStatus: OrderStatus;          // Enum → string
  amount: number;            // double → number
  deliveryFee: number;
  total: number;
  paymentDone: boolean;
  cashPayment: boolean;
  feeDelivered: boolean;

  // Customer Details
  customerName: string;
  customerPhone: string;
  customerAddress: string;

  // Verification & Logistics
  validationCode: string;
  codeValidate: boolean;
  customerDistance: number;

  // Nested Items
  items: CustomerOrderItemResponse[];
}
