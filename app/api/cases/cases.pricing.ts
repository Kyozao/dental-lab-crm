export type CasePricingState = {
  service_base_price_snapshot: string | null;
  case_price: string | null;
  is_price_overridden: boolean;
};

export function resolveEffectiveServiceBasePrice(args: {
  serviceTypeBasePrice: string;
  customerPriceTablePrice?: string | null;
}) {
  return args.customerPriceTablePrice ?? args.serviceTypeBasePrice;
}

export function resolveCasePricing(args: {
  currentServiceTypeId?: string | null;
  nextServiceTypeId?: string | null;
  currentServiceBasePriceSnapshot?: string | null;
  currentCasePrice?: string | null;
  currentIsPriceOverridden?: boolean;
  requestedCasePrice?: string | null;
  requestedIsPriceOverridden?: boolean;
  selectedServiceBasePrice?: string | null;
}): CasePricingState {
  const serviceChanged =
    args.nextServiceTypeId !== undefined &&
    args.nextServiceTypeId !== args.currentServiceTypeId;
  const nextSnapshot = serviceChanged
    ? args.selectedServiceBasePrice ?? null
    : args.currentServiceBasePriceSnapshot ?? args.selectedServiceBasePrice ?? null;
  const nextIsOverridden =
    args.requestedIsPriceOverridden ?? args.currentIsPriceOverridden ?? false;

  if (nextIsOverridden) {
    return {
      service_base_price_snapshot: nextSnapshot,
      case_price:
        args.requestedCasePrice !== undefined
          ? args.requestedCasePrice
          : args.currentCasePrice ?? nextSnapshot,
      is_price_overridden: true,
    };
  }

  return {
    service_base_price_snapshot: nextSnapshot,
    case_price: nextSnapshot,
    is_price_overridden: false,
  };
}
