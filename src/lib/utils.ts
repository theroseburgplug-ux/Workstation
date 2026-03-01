import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function renderInvoiceHTML(template: string, client: any, invoice: any) {
  const replace = (str: string, key: string, val: string) => str.split(`{{${key}}}`).join(val ?? "");

  const lineItemsHtml = (invoice.lineItems || []).map((li: any) => {
    const qty = li.qty ?? 1;
    const rate = (li.rate ?? 0) / 100;
    const total = (qty * (li.amount ? li.amount / 100 : rate)).toFixed(2);
    const rateStr = li.amount ? (li.amount / 100).toFixed(2) : rate.toFixed(2);
    return `<tr><td style="padding:8px;border-bottom:1px solid #eee">${li.description}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${qty}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${rateStr}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${total}</td></tr>`;
  }).join('');

  let out = template;
  out = replace(out, 'client.company', client?.company || client?.name || '');
  out = replace(out, 'client.name', client?.name || '');
  out = replace(out, 'client.email', client?.email || '');
  out = replace(out, 'invoice.invoiceNumber', invoice?.invoiceNumber || invoice?.id || '');
  out = replace(out, 'invoice.total', ((invoice?.total ?? 0) / 100).toFixed(2));
  out = replace(out, 'lineItems', lineItemsHtml);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invoice</title></head><body>${out}</body></html>`;
}

/**
 * Move tasks with status 'waiting' to the end of the list while preserving relative order.
 */
export function deprioritizeWaiting<T extends { status?: string }>(items: T[] = []) {
  if (!Array.isArray(items)) return items;
  return [...items].sort((a, b) => {
    const wa = String(a.status || '').toLowerCase() === 'waiting';
    const wb = String(b.status || '').toLowerCase() === 'waiting';
    if (wa === wb) return 0;
    return wa ? 1 : -1;
  });
}
