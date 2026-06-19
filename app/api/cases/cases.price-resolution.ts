export function resolveEffectiveServiceBasePrice(args: {
  serviceTypeBasePrice: string;
  customerPriceTablePrice?: string | null;
}) {
  return args.customerPriceTablePrice ?? args.serviceTypeBasePrice;
}
