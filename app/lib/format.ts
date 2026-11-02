const wholeNumber = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const preciseNumber = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
const peopleNumber = new Intl.NumberFormat('es-ES');
const percentNumber = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const euroNumber = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export const formatMillions = (value: number) => `${wholeNumber.format(value)} M€`;
export const formatPreciseMillions = (value: number) => `${preciseNumber.format(value)} M€`;
export const formatPeople = (value: number) => peopleNumber.format(value);
export const formatPercent = (value: number) => percentNumber.format(value);
export const formatEurosPerResident = (millionEuros: number, residentCount: number) => euroNumber.format(millionEuros * 1_000_000 / residentCount);
