export type PaymentStatus = 'active' | 'inactive';

export interface Payment {
  id: string;
  appointmentId: string;
  cashierId: string;
  cashierName: string;
  methodId: string;
  methodName: string;
  amount: number;
  reference: string;
  notes: string;
  paidAt: string;
  status: PaymentStatus;
}

export interface PaginatedPaymentsResponse {
  data: Payment[];
  total: number;
  page: number;
  limit: number;
}

export interface FindPaymentsParams {
  page?: number;
  limit?: number;
}
