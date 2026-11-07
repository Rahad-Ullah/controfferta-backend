import type { Stripe } from 'stripe/types';
import { CREDIT_CURRENCY } from '../../modules/creditPackage/creditPackage.constant';
import { CreditPackage } from '../../modules/creditPackage/creditPackage.model';
import { CreditPaymentStatus } from '../../modules/creditPurchase/creditPurchase.constant';
import { CreditPurchase } from '../../modules/creditPurchase/creditPurchase.model';
import { TransactionStatus } from '../../modules/transaction/transaction.constants';
import { Transaction } from '../../modules/transaction/transaction.model';

type StripeFee = {
  gatewayFee: number;
  paymentIntentId: string;
  paymentMethod: string;
};

// ---------------- fulfill credit purchase ----------------
// fee is the Stripe balance-transaction fee, already in euros
const fulfillCreditPurchase = async (purchaseId: string, fee: StripeFee) => {
  const purchase = await CreditPurchase.findOneAndUpdate(
    {
      _id: purchaseId,
      paymentStatus: CreditPaymentStatus.Unpaid,
    },
    {
      paymentStatus: CreditPaymentStatus.Paid,
    },
    { new: true },
  );
  if (!purchase?.transaction) return;

  await Transaction.findByIdAndUpdate(purchase.transaction, {
    status: TransactionStatus.Completed,
    isPaid: true,
    paidAt: new Date(),
    gatewayFee: fee.gatewayFee,
    currency: CREDIT_CURRENCY,
    gatewayReferenceId: fee.paymentIntentId,
    paymentMethod: fee.paymentMethod,
  });

  await CreditPackage.updateOne(
    { _id: purchase.package },
    { $inc: { purchaseCount: 1 } },
  );

  // todo: the credit ledger posts the credits; the balance stays unchanged until then
};

// ---------------- fail credit purchase ----------------
const failCreditPurchase = async (
  session: Stripe.Checkout.Session,
  status: TransactionStatus.Failed | TransactionStatus.Cancelled,
) => {
  const purchaseId = session.metadata?.referenceId;
  if (!purchaseId) return;

  const purchase = await CreditPurchase.findById(purchaseId);
  if (!purchase || purchase.paymentStatus !== CreditPaymentStatus.Unpaid)
    return;
  if (!purchase.transaction) return;

  await Transaction.updateOne(
    { _id: purchase.transaction },
    { status, isPaid: false },
  );
};

export const StripeFulfillment = {
  fulfillCreditPurchase,
  failCreditPurchase,
};
