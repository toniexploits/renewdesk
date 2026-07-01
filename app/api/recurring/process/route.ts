import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function advanceDate(dateStr: string, frequency: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  if (frequency === 'monthly')   d.setUTCMonth(d.getUTCMonth() + 1)
  if (frequency === 'quarterly') d.setUTCMonth(d.getUTCMonth() + 3)
  if (frequency === 'yearly')    d.setUTCFullYear(d.getUTCFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: due, error: fetchErr } = await admin
    .from('recurring_invoices')
    .select('*')
    .eq('status', 'active')
    .lte('next_due_date', today)

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!due || due.length === 0) return NextResponse.json({ ok: true, generated: 0 })

  let generated = 0
  const errors: string[] = []

  for (const schedule of due) {
    try {
      const invNumber = `REC-${Date.now().toString().slice(-6)}`
      const subtotal = (schedule.line_items as { qty: number; price: number }[])
        .reduce((s: number, item: { qty: number; price: number }) => s + item.qty * item.price, 0)
      const taxAmount = Math.round(subtotal * (schedule.tax_rate / 100) * 100) / 100
      const total = Math.round((subtotal + taxAmount) * 100) / 100

      const { error: insertErr } = await admin.from('invoices').insert({
        user_id:               schedule.user_id,
        inv_number:            invNumber,
        client_name:           schedule.client_name,
        client_email:          schedule.client_email,
        client_phone:          schedule.client_phone,
        contact_name:          schedule.contact_name,
        service_name:          schedule.service_name,
        service_plan:          schedule.service_plan,
        line_items:            schedule.line_items,
        tax_rate:              schedule.tax_rate,
        tax_amount:            taxAmount,
        subtotal,
        total,
        currency:              schedule.currency,
        notes:                 schedule.notes,
        bank_account_id:       schedule.bank_account_id,
        bank_details_snapshot: schedule.bank_details_snapshot,
        renewal_date:          advanceDate(schedule.next_due_date, schedule.frequency),
        status:                'pending',
        amount_paid:           0,
      })

      if (insertErr) { errors.push(`${schedule.id}: ${insertErr.message}`); continue }

      await admin
        .from('recurring_invoices')
        .update({
          next_due_date: advanceDate(schedule.next_due_date, schedule.frequency),
          updated_at:    new Date().toISOString(),
        })
        .eq('id', schedule.id)

      generated++
    } catch (e) {
      errors.push(`${schedule.id}: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  return NextResponse.json({ ok: true, generated, errors })
}
