export enum LeadStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Rejected = 'rejected',
  Closed = 'closed',
}

// The next status an admin is allowed to set.
export const leadStatusTransitions: Record<LeadStatus, LeadStatus[]> = {
  [LeadStatus.Pending]: [LeadStatus.Accepted, LeadStatus.Rejected],
  [LeadStatus.Accepted]: [LeadStatus.Closed],
  [LeadStatus.Rejected]: [],
  [LeadStatus.Closed]: [],
};
