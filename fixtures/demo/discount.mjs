// Planted demo bug (labeled): discount is capped at $15 and applies before tax.
// Bug: member path ignores the $15 cap.
export function total({ subtotal, discountPct = 0, taxPct = 0, member = false }) {
  const rawDiscount = (subtotal * discountPct) / 100;
  if (member) {
    // BUG: uncapped discount on member path.
    return (subtotal - rawDiscount) * (1 + taxPct / 100);
  }
  const discount = Math.min(rawDiscount, 15);
  return (subtotal - discount) * (1 + taxPct / 100);
}
