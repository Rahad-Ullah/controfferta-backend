export enum LeadAccessStatus {
  Unlocked = 'unlocked',
  Contacted = 'contacted',
  InProgress = 'in_progress',
  Completed = 'completed',
}

// The next status a provider is allowed to set.
export const leadAccessStatusTransitions: Record<
  LeadAccessStatus,
  LeadAccessStatus[]
> = {
  [LeadAccessStatus.Unlocked]: [LeadAccessStatus.Contacted],
  [LeadAccessStatus.Contacted]: [LeadAccessStatus.InProgress],
  [LeadAccessStatus.InProgress]: [LeadAccessStatus.Completed],
  [LeadAccessStatus.Completed]: [],
};
