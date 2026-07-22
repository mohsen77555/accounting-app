import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Account, Customer, PaymentEntry, PaymentType, PurchaseInvoice, SalesInvoice, Supplier } from '../types'
import { useAuth } from '../AuthContext'

interface AllocationDraft {
  invoiceId: string
  invoiceLabel: string
  outstanding: number
  allocate: string
}

export default function PaymentEntries() {
  const { role } = useAuth()
  const canWrite = role === 'admin' || role === 'accountant'

  const [entries, setEntries] = useState<PaymentEntry[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [bankAccounts, setBankAccounts] = useState<Account[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [paymentType, setPaymentType] = useState<PaymentType>('Receive')
  const [partyId, setPartyId] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [allocations, setAllocations] = useState<AllocationDraft[]>([])

  async function load() {
    const [{ data: pe, error: peErr }, { data: cust }, { data: supp }, { data: bank }] = await Promise.all([
      supabase.from('accounting_payment_entries').select('*').order('created_at', { ascending: false }),
      supabase.from('accounting_customers').select('*').order('code'),
      supabase.from('accounting_suppliers').select('*').order('code'),
      supabase.from('accounts').select('*').in('account_type', ['Bank', 'Cash']),
    ])
    if (peErr) setError(peErr.message)
    else setEntries(pe as PaymentEntry[])
    setCustomers((cust as Customer[]) ?? [])
    setSuppliers((supp as Supplier[]) ?? [])
    setBankAccounts((bank as Account[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function loadOutstandingInvoices(type: PaymentType, party: string) {
    if (!party) {
      setAllocations([])
      return
    }
    if (type === 'Receive') {
      const { data } = await supabase
        .from('accounting_sales_invoices')
        .select('*')
        .eq('customer_id', party)
        .eq('status', 'Submitted')
        .gt('outstanding_amount', 0)
      const rows = (data as SalesInvoice[]) ?? []
      setAllocations(
        rows.map((r) => ({
          invoiceId: r.id,
          invoiceLabel: `${r.invoice_number} (متبقي ${r.outstanding_amount})`,
          outstanding: r.outstanding_amount,
          allocate: '',
        })),
      )
    } else {
      const { data } = await supabase
        .from('accounting_purchase_invoices')
        .select('*')
        .eq('supplier_id', party)
        .eq('status', 'Submitted')
        .gt('outstanding_amount', 0)
      const rows = (data as PurchaseInvoice[]) ?? []
      setAllocations(
        rows.map((r) => ({
          invoiceId: r.id,
          invoiceLabel: `${r.invoice_number} (متبقي ${r.outstanding_amount})`,
          outstanding: r.outstanding_amount,
          allocate: '',
        })),
      )
    }
  }

  function handlePartyChange(id: string) {
    setPartyId(id)
    loadOutstandingInvoices(paymentType, id)
  }

  function handleTypeChange(type: PaymentType) {
    setPaymentType(type)
    setPartyId('')
    setAllocations([])
  }

  function updateAllocation(idx: number, value: string) {
    setAllocations((prev) => prev.map((a, i) => (i === idx ? { ...a, allocate: value } : a)))
  }

  const totalAllocated = allocations.reduce((s, a) => s + (parseFloat(a.allocate) || 0), 0)

  async function handleCreateDraft() {
    setError(null)
    if (!partyId || !bankAccountId || !amount) {
      setError('أكمل جميع الحقول')
      return
    }
    if (totalAllocated > parseFloat(amount)) {
      setError('مجموع التخصيصات أكبر من قيمة السند')
      return
    }

    const { data: pe, error: peErr } = await supabase
      .from('accounting_payment_entries')
      .insert({
        payment_type: paymentType,
        party_type: paymentType === 'Receive' ? 'Customer' : 'Supplier',
        party_id: partyId,
        bank_account_id: bankAccountId,
        posting_date: postingDate,
        amount: parseFloat(amount),
      })
      .select()
      .single()
    if (peErr || !pe) {
      setError(peErr?.message ?? 'تعذر إنشاء السند')
      return
    }

    const rows = allocations
      .filter((a) => parseFloat(a.allocate) > 0)
      .map((a) => ({
        payment_entry_id: pe.id,
        invoice_type: paymentType === 'Receive' ? 'Sales Invoice' : 'Purchase Invoice',
        invoice_id: a.invoiceId,
        allocated_amount: parseFloat(a.allocate),
      }))
    if (rows.length > 0) {
      const { error: allocErr } = await supabase.from('accounting_payment_entry_allocations').insert(rows)
      if (allocErr) {
        setError(allocErr.message)
        return
      }
    }

    setAmount('')
    setPartyId('')
    setAllocations([])
    load()
  }

  async function handleSubmitEntry(id: string) {
    setBusyId(id)
    setError(null)
    const { error } = await supabase.rpc('fn_submit_payment_entry', { p_id: id })
    setBusyId(null)
    if (error) setError(error.message)
    else load()
  }

  async function handleCancelEntry(id: string) {
    setBusyId(id)
    setError(null)
    const { error } = await supabase.rpc('fn_cancel_payment_entry', { p_id: id })
    setBusyId(null)
    if (error) setError(error.message)
    else load()
  }

  async function handleDeleteDraft(id: string) {
    setBusyId(id)
    setError(null)
    const { error } = await supabase.from('accounting_payment_entries').delete().eq('id', id)
    setBusyId(null)
    if (error) setError(error.message)
    else load()
  }

  function partyName(pe: PaymentEntry) {
    if (pe.party_type === 'Customer') return customers.find((c) => c.id === pe.party_id)?.name ?? pe.party_id
    return suppliers.find((s) => s.id === pe.party_id)?.name ?? pe.party_id
  }

  return (
    <div>
      <h1>سندات القبض والصرف</h1>
      {error && <div className="error">{error}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>الرقم</th>
            <th>النوع</th>
            <th>الطرف</th>
            <th>التاريخ</th>
            <th>المبلغ</th>
            <th>الحالة</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((pe) => (
            <tr key={pe.id}>
              <td>{pe.entry_number}</td>
              <td>{pe.payment_type === 'Receive' ? 'قبض' : 'صرف'}</td>
              <td>{partyName(pe)}</td>
              <td>{pe.posting_date}</td>
              <td>{pe.amount}</td>
              <td>
                <span className={`status-pill status-${pe.status.toLowerCase()}`}>{pe.status}</span>
              </td>
              <td>
                {canWrite && pe.status === 'Draft' && (
                  <>
                    <button disabled={busyId === pe.id} onClick={() => handleSubmitEntry(pe.id)}>
                      اعتماد
                    </button>{' '}
                    <button disabled={busyId === pe.id} onClick={() => handleDeleteDraft(pe.id)}>
                      حذف
                    </button>
                  </>
                )}
                {canWrite && pe.status === 'Submitted' && (
                  <button disabled={busyId === pe.id} onClick={() => handleCancelEntry(pe.id)}>
                    إلغاء
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {canWrite && (
        <div className="card-form">
          <h3>سند جديد</h3>
          <div className="form-row">
            <label>
              النوع
              <select value={paymentType} onChange={(e) => handleTypeChange(e.target.value as PaymentType)}>
                <option value="Receive">قبض من عميل</option>
                <option value="Pay">صرف لمورد</option>
              </select>
            </label>
            <label className="grow">
              {paymentType === 'Receive' ? 'العميل' : 'المورد'}
              <select value={partyId} onChange={(e) => handlePartyChange(e.target.value)}>
                <option value="">اختر</option>
                {(paymentType === 'Receive' ? customers : suppliers).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              حساب البنك/الصندوق
              <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
                <option value="">اختر</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              التاريخ
              <input type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
            </label>
            <label>
              المبلغ
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
          </div>

          {allocations.length > 0 && (
            <>
              <h3>تخصيص السداد للفواتير المستحقة</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الفاتورة</th>
                    <th>المبلغ المخصص</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((a, idx) => (
                    <tr key={a.invoiceId}>
                      <td>{a.invoiceLabel}</td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          max={a.outstanding}
                          value={a.allocate}
                          onChange={(e) => updateAllocation(idx, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>مجموع المخصص</td>
                    <td>{totalAllocated.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </>
          )}

          <div>
            <button onClick={handleCreateDraft}>حفظ كمسودة</button>
          </div>
        </div>
      )}
    </div>
  )
}
