import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invoiceId, frequency, startDate } = await req.json()
  if (!invoiceId || !frequency || !startDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch the source invoice
  const { data: invoice, error: invErr } = await admin
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('user_id', user.id)
    .single()

  if (invErr || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  // Upsert recurring schedule (one per source invoice)
  const { data, error } = await admin
    .from('recurring_invoices')
    .upsert({
      user_id:               user.id,
      client_name:           invoice.client_name,
      client_email:          invoice.client_email,
      client_phone:          invoice.client_phone,
      contact_name:          invoice.contact_name,
      service_name:          invoice.service_name,
      service_plan:          invoice.service_plan,
      line_items:            invoice.line_items,
      tax_rate:              invoice.tax_rate,
      currency:              invoice.currency ?? 'NGN',
      notes:                 invoice.notes,
      bank_account_id:       invoice.bank_account_id,
      bank_details_snapshot: invoice.bank_details_snapshot,
      frequency,
      next_due_date:         startDate,
      status:                'active',
      source_invoice_id:     invoiceId,
      updated_at:            new Date().toISOString(),
    }, { onConflict: 'source_invoice_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}
