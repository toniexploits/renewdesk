import type { Currency, DiscountType } from '@/lib/types'

const SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  GBP: '£',
  EUR: '€',
  KES: 'KSh ',
  GHS: 'GH₵ ',
  ZAR: 'R ',
}

export function getCurrencySymbol(currency: string): string {
  return SYMBOLS[currency] ?? ''
}

export function formatAmount(amount: number, currency: string): string {
  const sym = getCurrencySymbol(currency)
  return sym + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// For dashboard metric cards — no decimals, saves space on mobile
export function formatAmountShort(amount: number, currency: string): string {
  const sym = getCurrencySymbol(currency)
  return sym + Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: 'NGN', label: 'NGN — ₦ Nigerian Naira' },
  { value: 'USD', label: 'USD — $ US Dollar' },
  { value: 'GBP', label: 'GBP — £ British Pound' },
  { value: 'EUR', label: 'EUR — € Euro' },
  { value: 'KES', label: 'KES — KSh Kenyan Shilling' },
  { value: 'GHS', label: 'GHS — GH₵ Ghanaian Cedi' },
  { value: 'ZAR', label: 'ZAR — R South African Rand' },
]

// Discount is applied to the subtotal before tax. Clamped so it never exceeds the subtotal.
export function calcDiscount(subtotal: number, type: DiscountType, value: number): number {
  if (!value || value <= 0 || subtotal <= 0) return 0
  const raw = type === 'percent' ? (subtotal * Math.min(value, 100)) / 100 : value
  return Math.min(raw, subtotal)
}

// Label for the discount row, e.g. "Discount (10%)" or "Discount"
export function discountLabel(type: DiscountType | null | undefined, value: number | null | undefined): string {
  return type === 'percent' && value ? `Discount (${value}%)` : 'Discount'
}
