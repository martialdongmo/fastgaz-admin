export interface PageResponse<T> {
  content: T[];          // List<T> → T[]
  page: number;          // int → number
  size: number;          // int → number
  totalElements: number; // long → number
  totalPages: number;    // int → number
  first: boolean;        // boolean → boolean
  last: boolean;         // boolean → boolean
}
