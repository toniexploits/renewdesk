export type Currency = 'NGN' | 'USD' | 'GBP' | 'EUR' | 'KES' | 'GHS' | 'ZAR'

export interface LineItem {
  id: string
  desc: string
  qty: number
  price: number
}

export interface Profile {
  id: string
  full_name: string | null
  business_name: string | null
  business_email: string | null
  currency: string
  tax_rate: number
  bank_name: string | null
  account_name: string | null
  account_number: string | null
  bank_country: string
  swift_code: string | null
  iban: string | null
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface BankAccount {
  id: string
  user_id: string
  account_label: string
  bank_name: string
  account_name: string
  account_number: string
  bank_country: string
  swift_code: string | null
  iban: string | null
  currency: string
  is_default: boolean
  created_at: string
}

export interface BankDetailsSnapshot {
  account_label: string | null
  bank_name: string
  account_name: string
  account_number: string
  bank_country: string
  swift_code: string | null
  iban: string | null
  currency: string
}

export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled' | 'draft' | 'partial'

export interface Payment {
  id: string
  invoice_id: string
  user_id: string
  amount: number
  currency: string
  payment_date: string
  notes: string | null
  created_at: string
}

export interface Invoice {
  id: string
  user_id: string
  inv_number: string
  client_name: string
  client_email: string | null
  client_phone: string | null
  contact_name: string | null
  service_name: string | null
  service_plan: string | null
  renewal_date: string | null
  line_items: LineItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  currency: string | null
  status: InvoiceStatus
  notes: string | null
  payment_date: string | null
  amount_paid: number
  bank_account_id: string | null
  bank_details_snapshot: BankDetailsSnapshot | null
  created_at: string
  updated_at: string
}

export interface SubscriptionPlan {
  id: string
  name: 'starter' | 'pro' | 'agency'
  display_name: string
  monthly_price_ngn: number
  yearly_price_ngn: number
  monthly_price_usd: number
  yearly_price_usd: number
  invoice_limit: number | null
  quote_limit: number | null
  bank_account_limit: number | null
  features: string[]
}

export interface UserSubscription {
  id: string
  user_id: string
  plan_name: 'starter' | 'pro' | 'agency'
  billing_currency: 'NGN' | 'USD'
  billing_interval: 'monthly' | 'yearly'
  status: 'active' | 'cancelled' | 'past_due' | 'trialing'
  paystack_customer_code: string | null
  paystack_subscription_code: string | null
  paystack_plan_code: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export interface UsageTracking {
  id: string
  user_id: string
  billing_month: string
  invoices_created: number
  quotes_created: number
  reset_at: string | null
  updated_at: string
}

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'converted'

export interface Quote {
  id: string
  user_id: string
  quote_number: string
  client_name: string
  client_email: string | null
  client_phone: string | null
  contact_name: string | null
  service_name: string | null
  service_plan: string | null
  validity_days: number
  valid_until: string | null
  line_items: LineItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  currency: string | null
  notes: string | null
  status: QuoteStatus
  converted_invoice_id: string | null
  bank_account_id: string | null
  bank_details_snapshot: BankDetailsSnapshot | null
  created_at: string
  updated_at: string
}
