export interface AdminUserResponse {

    id: number;          // Long in Java → number in TS
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    role: string;        // Could be 'CUSTOMER' | 'ADMIN' if you want stricter typing
    active: boolean;
}
