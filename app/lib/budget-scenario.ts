export type BudgetLine = {
  id: string;
  label: string;
  officialLabel: string;
  description: string;
  amount: number;
  color: string;
  relatedSources?: { label: string; href: string }[];
};

const step = 1;

/**
 * Balanced mode: total spending is capped at revenue (other lines shrink to make room).
 * Deficit mode: each line may reach the revenue total on its own and the overall
 * excess is shown as financing that would have to be borrowed.
 */
export type ScenarioOptions = { allowDeficit?: boolean };

export function maxBudgetLineAmount(total: number) {
  return Math.max(0, Math.floor(total / step) * step);
}

export function setBudgetLineAmount(current: number[], index: number, requestedAmount: number, total: number, options: ScenarioOptions = {}) {
  if (index < 0 || index >= current.length) return current;

  const nextAmount = Math.max(0, Math.min(maxBudgetLineAmount(total), Math.round(requestedAmount / step) * step));
  const next = [...current];
  next[index] = nextAmount;
  if (options.allowDeficit) return next;

  const otherIndexes = current.map((_, position) => position).filter(position => position !== index);
  const otherTotal = otherIndexes.reduce((sum, position) => sum + current[position], 0);
  const availableForOthers = Math.max(0, total - nextAmount);
  if (otherTotal > availableForOthers) {
    const scale = availableForOthers / otherTotal;
    otherIndexes.forEach(position => {
      next[position] = Math.floor(current[position] * scale / step) * step;
    });
  }
  return next;
}

export function getUnallocatedBudget(amounts: number[], total: number) {
  return Math.max(0, total - amounts.reduce((sum, amount) => sum + amount, 0));
}

/** Spending above revenue: what the scenario would need to borrow. */
export function getScenarioDeficit(amounts: number[], total: number) {
  return Math.max(0, amounts.reduce((sum, amount) => sum + amount, 0) - total);
}

/** Revenue minus scenario spending; negative means deficit. */
export function getScenarioBalance(amounts: number[], total: number) {
  return total - amounts.reduce((sum, amount) => sum + amount, 0);
}

export function buildBudgetGradient(lines: BudgetLine[], amounts: number[], total: number) {
  // With a deficit the ring represents total spending, so slices never exceed 100 %.
  const base = Math.max(total, amounts.reduce((sum, amount) => sum + amount, 0));
  if (base <= 0) return '#e7e9e4 0% 100%';

  let position = 0;
  const slices = amounts.flatMap((amount, index) => {
    if (amount <= 0) return [];
    const start = position;
    position += amount / base * 100;
    return [`${lines[index].color} ${start}% ${position}%`];
  });

  const unallocated = getUnallocatedBudget(amounts, total);
  if (unallocated > 0) slices.push(`#e7e9e4 ${position}% 100%`);
  return slices.length ? slices.join(', ') : '#e7e9e4 0% 100%';
}

export function encodeScenario(lines: BudgetLine[], amounts: number[]) {
  return lines.map((line, index) => `${encodeURIComponent(line.id)}:${Math.max(0, Math.round(amounts[index] ?? 0))}`).join(';');
}

export function decodeScenario(value: string | null, lines: BudgetLine[], total: number, options: ScenarioOptions = {}) {
  if (!value || !lines.length || total < 0) return null;
  const parsed = new Map<string, number>();
  for (const entry of value.split(';')) {
    const separator = entry.lastIndexOf(':');
    if (separator < 1) return null;
    let id: string;
    try { id = decodeURIComponent(entry.slice(0, separator)); } catch { return null; }
    const amount = Number(entry.slice(separator + 1));
    if (!Number.isFinite(amount) || amount < 0 || parsed.has(id)) return null;
    parsed.set(id, Math.round(amount));
  }
  if (parsed.size !== lines.length || lines.some(line => !parsed.has(line.id))) return null;
  const max = maxBudgetLineAmount(total);
  if (options.allowDeficit) return lines.map(line => Math.min(max, parsed.get(line.id)!));
  const amounts = lines.map(line => parsed.get(line.id)!);
  return fitAmountsToBudget(amounts, total);
}

/** Scales every item down proportionally so the sum fits within revenue. */
export function fitAmountsToBudget(amounts: number[], total: number) {
  const max = maxBudgetLineAmount(total);
  const sum = amounts.reduce((value, amount) => value + amount, 0);
  if (sum <= max) return amounts;
  const scaled = amounts.map(amount => Math.floor(amount * max / sum));
  let remainder = max - scaled.reduce((value, amount) => value + amount, 0);
  for (let index = 0; remainder > 0 && index < scaled.length; index += 1) {
    if (amounts[index] > 0) { scaled[index] += 1; remainder -= 1; }
  }
  return scaled;
}

/**
 * Slider scale for one item: up to three times its official amount, so small
 * items (subsidies, interest) are as easy to move as large ones. The scale grows
 * if a typed amount goes beyond it, and never exceeds the revenue total.
 */
export function lineSliderMax(official: number, current: number, total: number) {
  const cap = maxBudgetLineAmount(total);
  const scale = Math.max(official * 3, current, 1);
  return Math.min(cap, Math.ceil(scale / step) * step);
}

/** Button step: 5 % of the official amount, at least 1 M€. */
export function lineStep(official: number) {
  return Math.max(step, Math.round(official * 0.05 / step) * step);
}

/** Initial scenario: the official spending, with deficit mode on if it exceeded revenue. */
export function officialScenario(lines: BudgetLine[], total: number) {
  const amounts = lines.map(line => line.amount);
  return { amounts, allowDeficit: amounts.reduce((sum, amount) => sum + amount, 0) > total };
}

/** Euros per resident for an amount in millions of euros. */
export function eurosPerResident(millions: number, residents: number) {
  return residents > 0 ? millions * 1_000_000 / residents : 0;
}

/**
 * Widths (in %) for a spending bar: the part covered by revenue and, with a
 * deficit, the borrowed part. The bar is scaled to whichever is larger, so the
 * borrowed part is always visible and both add up to 100 % when overspending.
 */
export function spendingBar(spent: number, revenue: number) {
  const base = Math.max(spent, revenue, 1);
  return { fill: Math.min(spent, revenue) / base * 100, overflow: Math.max(0, spent - revenue) / base * 100 };
}
