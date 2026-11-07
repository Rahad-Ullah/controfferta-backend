export const CREDIT_CURRENCY = 'EUR';

// A whole euro is above Stripe's 50-cent minimum. The Stripe call sends price * 100.
export const MINIMUM_PACKAGE_PRICE = 1;

export enum CreditPackageStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export enum CreditPackageTag {
  Popular = 'popular',
  Recommended = 'recommended',
}
