import type { PurchasesOffering, CustomerInfo } from '@revenuecat/purchases-capacitor'

import type { EntitlementSnapshot } from '@/repositories/purchases/purchases-repository'
import type { SubscriptionOffering, SubscriptionPackage } from '@/types/subscription'

/** Common ISO-8601 durations RevenueCat/the stores actually send. Anything else is left blank. */
const PERIOD_LABELS: Record<string, string> = {
  P1D: 'day',
  P1W: 'week',
  P1M: 'month',
  P2M: '2 months',
  P3M: '3 months',
  P6M: '6 months',
  P1Y: 'year',
}

function toPeriodLabel(subscriptionPeriod: string | null): string | null {
  if (!subscriptionPeriod) return null
  return PERIOD_LABELS[subscriptionPeriod] ?? null
}

/** The only place a raw RevenueCat offering becomes our own presentation type. */
export function toSubscriptionOffering(offering: PurchasesOffering): SubscriptionOffering {
  const packages: SubscriptionPackage[] = offering.availablePackages.map((pkg) => ({
    id: pkg.identifier,
    productId: pkg.product.identifier,
    title: pkg.product.title,
    description: pkg.product.description,
    priceString: pkg.product.priceString,
    periodLabel: toPeriodLabel(pkg.product.subscriptionPeriod),
  }))
  return { id: offering.identifier, packages }
}

export function toEntitlementSnapshot(customerInfo: CustomerInfo): EntitlementSnapshot {
  return {
    activeEntitlementIds: Object.values(customerInfo.entitlements.all)
      .filter((entitlement) => entitlement.isActive)
      .map((entitlement) => entitlement.identifier),
  }
}
