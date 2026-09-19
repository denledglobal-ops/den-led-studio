export const BILLING_PLANS = {
  starter: { label: "Starter", credits: 30 },
  pro: { label: "Pro", credits: 80 },
  enterprise: { label: "Enterprise", credits: 200 },
} as const;

export type BillingPlan = keyof typeof BILLING_PLANS;

export function isBillingPlan(value: string): value is BillingPlan {
  return value in BILLING_PLANS;
}
