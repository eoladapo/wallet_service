export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED'
}

export interface Account {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}
