'use client'

import type { BankAccount, BankDetailsSnapshot } from '@/lib/types'

const INPUT = 'w-full px-3.5 py-2.5 rounded-lg bg-surface border border-black/10 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-gray-300 text-base text-gray-900'

export interface CustomBankFields {
  bank_name: string
  account_name: string
  account_number: string
  bank_country: string
  swift_code: string
  iban: string
}

export const EMPTY_CUSTOM: CustomBankFields = {
  bank_name: '',
  account_name: '',
  account_number: '',
  bank_country: 'Nigeria',
  swift_code: '',
  iban: '',
}

export function maskAccountNumber(num: string): string {
  if (!num) return ''
  const digits = num.replace(/\s/g, '')
  if (digits.length <= 4) return digits
  return '****' + digits.slice(-4)
}

/**
 * Build the snapshot to persist on an invoice/quote.
 * If `useCustom`, snapshot the custom fields; otherwise snapshot the selected account.
 * Returns null if neither selection nor custom data is meaningful.
 */
export function buildBankSnapshot(
  selected: BankAccount | null,
  useCustom: boolean,
  custom: CustomBankFields,
  invoiceCurrency: string
): BankDetailsSnapshot | null {
  if (useCustom) {
    if (!custom.bank_name && !custom.account_name && !custom.account_number) return null
    return {
      account_label: null,
      bank_name: custom.bank_name,
      account_name: custom.account_name,
      account_number: custom.account_number,
      bank_country: custom.bank_country || 'Nigeria',
      swift_code: custom.swift_code || null,
      iban: custom.iban || null,
      currency: invoiceCurrency,
    }
  }
  if (!selected) return null
  return {
    account_label: selected.account_label,
    bank_name: selected.bank_name,
    account_name: selected.account_name,
    account_number: selected.account_number,
    bank_country: selected.bank_country,
    swift_code: selected.swift_code,
    iban: selected.iban,
    currency: selected.currency,
  }
}

interface Props {
  accounts: BankAccount[]
  selectedId: string | null
  onSelectedChange: (id: string | null) => void
  useCustom: boolean
  onUseCustomChange: (useCustom: boolean) => void
  custom: CustomBankFields
  onCustomChange: (custom: CustomBankFields) => void
}

export default function BankAccountSelector({
  accounts,
  selectedId,
  onSelectedChange,
  useCustom,
  onUseCustomChange,
  custom,
  onCustomChange,
}: Props) {
  const selected = accounts.find((a) => a.id === selectedId) ?? null

  function setCustomField<K extends keyof CustomBankFields>(key: K, value: CustomBankFields[K]) {
    onCustomChange({ ...custom, [key]: value })
  }

  if (accounts.length === 0) {
    return (
      <div
        className="rounded-lg p-3 text-xs text-amber-800"
        style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}
      >
        No bank accounts saved yet. Add one in{' '}
        <a href="/dashboard/settings" className="font-semibold underline">
          Settings
        </a>{' '}
        to receive payments, or use one-off details below.
        <div className="mt-2">
          <button
            type="button"
            onClick={() => onUseCustomChange(true)}
            className="text-xs font-medium text-amber-900 underline"
          >
            Add one-off bank details for this invoice
          </button>
        </div>
        {useCustom && (
          <div className="mt-3">
            <CustomFieldsForm custom={custom} setCustomField={setCustomField} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Receiving account</label>
      <select
        className={INPUT}
        value={selectedId ?? ''}
        onChange={(e) => onSelectedChange(e.target.value || null)}
        disabled={useCustom}
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.account_label} — {a.bank_name} {maskAccountNumber(a.account_number)}
          </option>
        ))}
      </select>

      {/* Read-only preview of selected account */}
      {!useCustom && selected && (
        <div
          className="mt-2 rounded-lg p-3 text-xs leading-6"
          style={{ background: '#f7f6f2', border: '1px solid rgba(0,0,0,0.06)' }}
        >
          <p className="text-gray-700"><span className="text-gray-400">Bank:</span> {selected.bank_name}</p>
          <p className="text-gray-700"><span className="text-gray-400">Account name:</span> {selected.account_name}</p>
          <p className="text-gray-700"><span className="text-gray-400">Account number:</span> {selected.account_number}</p>
          {selected.swift_code && (
            <p className="text-gray-700"><span className="text-gray-400">SWIFT/BIC:</span> {selected.swift_code}</p>
          )}
          {selected.iban && (
            <p className="text-gray-700"><span className="text-gray-400">IBAN:</span> {selected.iban}</p>
          )}
          <p className="text-gray-400 mt-1 text-[11px]">Currency: {selected.currency}</p>
        </div>
      )}

      {/* Toggle */}
      <button
        type="button"
        onClick={() => onUseCustomChange(!useCustom)}
        className="mt-2.5 flex items-center gap-1.5 text-xs text-brand font-medium hover:text-brand-dark transition-colors"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${useCustom ? 'rotate-45' : ''}`}
        >
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        {useCustom ? 'Use a saved account instead' : 'Use different details for this invoice'}
      </button>

      {/* Custom fields (one-off) */}
      <div
        className="overflow-hidden transition-all"
        style={{ maxHeight: useCustom ? 800 : 0 }}
      >
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
            One-off bank details
          </p>
          <CustomFieldsForm custom={custom} setCustomField={setCustomField} />
        </div>
      </div>
    </div>
  )
}

function CustomFieldsForm({
  custom,
  setCustomField,
}: {
  custom: CustomBankFields
  setCustomField: <K extends keyof CustomBankFields>(key: K, value: CustomBankFields[K]) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <CustomField label="Bank name">
        <input
          className={INPUT}
          value={custom.bank_name}
          onChange={(e) => setCustomField('bank_name', e.target.value)}
        />
      </CustomField>
      <CustomField label="Account name">
        <input
          className={INPUT}
          value={custom.account_name}
          onChange={(e) => setCustomField('account_name', e.target.value)}
        />
      </CustomField>
      <CustomField label="Account number">
        <input
          className={INPUT}
          value={custom.account_number}
          onChange={(e) => setCustomField('account_number', e.target.value)}
        />
      </CustomField>
      <CustomField label="Country">
        <input
          className={INPUT}
          value={custom.bank_country}
          onChange={(e) => setCustomField('bank_country', e.target.value)}
        />
      </CustomField>
      <CustomField label="SWIFT / BIC (optional)">
        <input
          className={INPUT}
          value={custom.swift_code}
          onChange={(e) => setCustomField('swift_code', e.target.value)}
        />
      </CustomField>
      <CustomField label="IBAN (optional)">
        <input
          className={INPUT}
          value={custom.iban}
          onChange={(e) => setCustomField('iban', e.target.value)}
        />
      </CustomField>
    </div>
  )
}

function CustomField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  )
}
