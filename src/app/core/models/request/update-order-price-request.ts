export interface UpdateOrderPriceRequest {
  newPrice: number;       // Double → number
  newTotal: number;       // Double → number
  updateReason: string;   // String → string
  deliveryFee: number;    // double → number
}
