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
  created_at: string
  updated_at: string
}

export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled' | 'draft'

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
  created_at: string
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
  created_at: string
  updated_at: string
}
