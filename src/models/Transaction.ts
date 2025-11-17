export enum TransactionType {
  FUND = 'FUND',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  WITHDRAW = 'WITHDRAW'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED'
}

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  relatedAccountId?: string;
  relatedTransactionId?: string;
  reference: string;
  description: string;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
}
