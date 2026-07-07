export interface ReassignStoreRequest {
  targetStoreId: number;                        // Long → number
  itemProductMapping: { [key: number]: number };// Map<Long, Long> → object with numeric keys/values
  manualPriceOverrides: { [key: number]: number }; // Map<Long, Double> → object with numeric keys and number values
  reason: string;                               // String → string
}
