import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function assertAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'super_admin'].includes(p?.role ?? '')) return null
  return user
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const caller = await assertAdmin()
  if (!caller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { id } = params

  const [
    { data: profile },
    { data: recentInvoices },
    { data: recentQuotes },
    { data: invoiceAgg },
    { data: quoteAgg },
  ] = await Promise.all([
    admin.from('profiles').select('*').eq('id', id).single(),
    admin.from('invoices').select('id, inv_number, client_name, total, status, created_at')
      .eq('user_id', id).order('created_at', { ascending: false }).limit(5),
    admin.from('quotes').select('id, quote_number, client_name, total, status, created_at')
      .eq('user_id', id).order('created_at', { ascending: false }).limit(5),
    admin.from('invoices').select('total, status').eq('user_id', id),
    admin.from('quotes').select('id').eq('user_id', id),
  ])

  const allInv = (invoiceAgg ?? []) as { total: number; status: string }[]
  const totalValue = allInv.reduce((s, r) => s + (r.total ?? 0), 0)
  const paidValue  = allInv.filter(r => r.status === 'paid').reduce((s, r) => s + (r.total ?? 0), 0)

  return NextResponse.json({
    ...(profile ?? {}),
    invoice_count:   allInv.length,
    quote_count:     (quoteAgg ?? []).length,
    total_value:     totalValue,
    paid_value:      paidValue,
    recent_invoices: recentInvoices ?? [],
    recent_quotes:   recentQuotes ?? [],
  })
}
