// Request DTOs
export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface FundAccountRequest {
  amount: number;
}

export interface TransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
}

export interface WithdrawRequest {
  amount: number;
}

// Response DTOs
export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
}

export interface AccountResponse {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountWithUserResponse extends AccountResponse {
  user: UserResponse;
}

export interface TransactionResponse {
  id: string;
  accountId: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  relatedAccountId?: string;
  relatedTransactionId?: string;
  reference: string;
  description: string;
  status: string;
  createdAt: Date;
}

export interface FundAccountResponse {
  account: AccountResponse;
  transaction: TransactionResponse;
}

export interface TransferResponse {
  fromAccount: AccountResponse;
  toAccount: AccountResponse;
  debitTransaction: TransactionResponse;
  creditTransaction: TransactionResponse;
}

export interface WithdrawResponse {
  account: AccountResponse;
  transaction: TransactionResponse;
}

export interface TransactionHistoryResponse {
  transactions: TransactionResponse[];
  page: number;
  limit: number;
  total: number;
}
