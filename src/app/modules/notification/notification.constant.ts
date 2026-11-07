export enum NotificationType {
  AccountUpdated = 'account_updated',
  CouponCreated = 'coupon_created',
  PolicyUpdated = 'policy_updated',
  RefundFailed = 'refund_failed',
}

export enum NotificationQueueJob {
  BroadcastToUsers = 'broadcast-to-users',
}
