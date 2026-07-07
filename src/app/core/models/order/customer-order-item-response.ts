export interface CustomerOrderItemResponse {
    id: number;             // Long → number
    quantity: number;       // int → number
    price: number;          // double → number
    withPackaging: boolean; // boolean → boolean
    productId: number;      // Long → number
    productName: string;    // String → string
    shopName: string;       // String → string
}
