export const COUNTRY = "Angola";
export const CURRENCY = "AOA";

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
    Math.round(n || 0)
  );
}

export function fmtMoney(n: number): string {
  return `${fmt(n)} ${CURRENCY}`;
}

export type Delivery = {
  id: string;
  delivery_date: string;
  agent: string | null;
  order_id: string | null;
  amount_collected: number;
  delivery_fee: number;
  comment: string | null;
};

export type Charge = {
  id: string;
  charge_date: string;
  description: string | null;
  category: string | null;
  amount: number;
};

export type Remittance = {
  id: string;
  remit_date: string;
  amount: number;
  method: string | null;
  status: string;
};
