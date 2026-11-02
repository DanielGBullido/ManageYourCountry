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

export function maxBudgetLineAmount(total: number) {
  return Math.max(0, Math.floor(total / step) * step);
}

export function setBudgetLineAmount(current: number[], index: number, requestedAmount: number, total: number) {
  if (index < 0 || index >= current.length) return current;

  const nextAmount = Math.max(0, Math.min(maxBudgetLineAmount(total), Math.round(requestedAmount / step) * step));
  const next = [...current];
  next[index] = nextAmount;

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

export function buildBudgetGradient(lines: BudgetLine[], amounts: number[], total: number) {
  if (total <= 0) return '#e7e9e4 0% 100%';

  let position = 0;
  const slices = amounts.flatMap((amount, index) => {
    if (amount <= 0) return [];
    const start = position;
    position += amount / total * 100;
    return [`${lines[index].color} ${start}% ${position}%`];
  });

  const unallocated = getUnallocatedBudget(amounts, total);
  if (unallocated > 0) slices.push(`#e7e9e4 ${position}% 100%`);
  return slices.length ? slices.join(', ') : '#e7e9e4 0% 100%';
}

export function encodeScenario(lines: BudgetLine[], amounts: number[]) {
  return lines.map((line, index) => `${encodeURIComponent(line.id)}:${Math.max(0, Math.round(amounts[index] ?? 0))}`).join(';');
}

export function decodeScenario(value: string | null, lines: BudgetLine[], total: number) {
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
  const amounts = lines.map(line => parsed.get(line.id)!);
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
