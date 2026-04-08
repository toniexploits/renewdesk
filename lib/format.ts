import type { Currency } from '@/lib/types'

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

export const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: 'NGN', label: 'NGN — ₦ Nigerian Naira' },
  { value: 'USD', label: 'USD — $ US Dollar' },
  { value: 'GBP', label: 'GBP — £ British Pound' },
  { value: 'EUR', label: 'EUR — € Euro' },
  { value: 'KES', label: 'KES — KSh Kenyan Shilling' },
  { value: 'GHS', label: 'GHS — GH₵ Ghanaian Cedi' },
  { value: 'ZAR', label: 'ZAR — R South African Rand' },
]
