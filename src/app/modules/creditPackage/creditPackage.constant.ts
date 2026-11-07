export const CREDIT_CURRENCY = 'EUR';

// Stripe rejects an EUR charge below 50 cents.
export const MINIMUM_PACKAGE_PRICE = 50;

export enum CreditPackageStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export enum CreditPackageTag {
  Popular = 'popular',
  Recommended = 'recommended',
}
