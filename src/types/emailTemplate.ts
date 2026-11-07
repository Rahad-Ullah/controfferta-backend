
export type ICreateAccount = {
  email: string;
  otp: number;
};

export type IResetPassword = {
  email: string;
  otp: number;
};

export interface ILowBalanceWarning {
  adminEmail: string;
  gatewayName: string;
  currentBalance: number;
  requiredBalance: number;
  currency: string;
}