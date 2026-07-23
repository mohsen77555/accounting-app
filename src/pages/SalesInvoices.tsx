import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import type { Account, Customer, Item, SalesInvoice } from '../types'
import { useAuth } from '../AuthContext'

interface LineDraft {
  item_id: string
  qty: string
  rate: string
  discount_percent: string
}

function emptyLine(): LineDraft {
  return { item_id: '', qty: '', rate: '', discount_percent: '' }
}

function lineAmount(l: LineDraft) {
  const qty = parseFloat(l.qty) || 0
  const rate = parseFloat(l.rate) || 0
  const discount = parseFloat(l.discount_percent) || 0
  return qty * rate * (1 - discount / 100)
}

export default function SalesInvoices() {
  const { role } = useAuth()
  const canWrite = role === 'admin' || role === 'accountant'

  const [invoices, setInvoices] = useState<SalesInvoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [customerId, setCustomerId] = useState('')
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [remarks, setRemarks] = useState('')
  const [taxPercent, setTaxPercent] = useState('')
  const [taxAccountId, setTaxAccountId] = useState('')
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()])

  async function load() {
    const [{ data: inv, error: invErr }, { data: cust }, { data: it }, { data: acc }] = await Promise.all([
      supabase.from('accounting_sales_invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('accounting_customers').select('*').order('code'),
      supabase.from('accounting_items').select('*').order('code'),
      supabase.from('accounts').select('*').eq('is_group', false).order('code'),
    ])
    if (invErr) setError(invErr.message)
    else setInvoices(inv as SalesInvoice[])
    setCustomers((cust as Customer[]) ?? [])
    setItems((it as Item[]) ?? [])
    setAccounts((acc as Account[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  function updateLine(idx: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }
  function addLine() {
    setLines((prev) => [...prev, emptyLine()])
  }
  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx))
  }

  const subtotal = lines.reduce((sum, l) => sum + lineAmount(l), 0)
  const taxAmount = subtotal * ((parseFloat(taxPercent) || 0) / 100)
  const total = subtotal + taxAmount

  async function handleCreateDraft() {
    setError(null)
    if (!customerId) {
      setError('اختر عميلًا')
      return
    }
    const validLines = lines.filter((l) => l.item_id && parseFloat(l.qty) > 0)
    if (validLines.length === 0) {
      setError('أضف سطرًا واحدًا على الأقل')
      return
    }
    if (parseFloat(taxPercent) > 0 && !taxAccountId) {
      setError('اختر حساب الضريبة لأن نسبة الضريبة أكبر من صفر')
      return
    }

    const { data: inv, error: invErr } = await supabase
      .from('accounting_sales_invoices')
      .insert({
        customer_id: customerId,
        posting_date: postingDate,
        due_date: dueDate || null,
        remarks,
        tax_percent: parseFloat(taxPercent) || 0,
        tax_account_id: taxAccountId || null,
      })
      .select()
      .single()
    if (invErr || !inv) {
      setError(invErr?.message ?? 'تعذر إنشاء الفاتورة')
      return
    }

    const rows = validLines.map((l, i) => ({
      invoice_id: inv.id,
      line_no: i + 1,
      item_id: l.item_id,
      qty: parseFloat(l.qty),
      rate: parseFloat(l.rate) || 0,
      discount_percent: parseFloat(l.discount_percent) || 0,
    }))
    const { error: linesErr } = await supabase.from('accounting_sales_invoice_items').insert(rows)
    if (linesErr) {
      setError(linesErr.message)
      return
    }

    setRemarks('')
    setDueDate('')
    setTaxPercent('')
    setTaxAccountId('')
    setLines([emptyLine()])
    load()
  }

  async function handleSubmitInvoice(id: string) {
    setBusyId(id)
    setError(null)
    const { error } = await supabase.rpc('fn_submit_sales_invoice', { p_invoice_id: id })
    setBusyId(null)
    if (error) setError(error.message)
    else load()
  }

  async function handleCancelInvoice(id: string) {
    setBusyId(id)
    setError(null)
    const { error } = await supabase.rpc('fn_cancel_sales_invoice', { p_invoice_id: id })
    setBusyId(null)
    if (error) setError(error.message)
    else load()
  }

  async function handleDeleteDraft(id: string) {
    setBusyId(id)
    setError(null)
    const { error } = await supabase.from('accounting_sales_invoices').delete().eq('id', id)
    setBusyId(null)
    if (error) setError(error.message)
    else load()
  }

  function customerName(id: string) {
    return customers.find((c) => c.id === id)?.name ?? id
  }

  return (
    <div>
      <h1>فواتير المبيعات</h1>
      {error && <div className="error">{error}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>الرقم</th>
            <th>العميل</th>
            <th>التاريخ</th>
            <th>الحالة</th>
            <th>الضريبة</th>
            <th>الإجمالي</th>
            <th>المتبقي</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td>{inv.invoice_number}</td>
              <td>{customerName(inv.customer_id)}</td>
              <td>{inv.posting_date}</td>
              <td>
                <span className={`status-pill status-${inv.status.toLowerCase()}`}>{inv.status}</span>
              </td>
              <td>{inv.tax_amount}</td>
              <td>{inv.total_amount}</td>
              <td>{inv.outstanding_amount}</td>
              <td>
                {canWrite && inv.status === 'Draft' && (
                  <>
                    <button disabled={busyId === inv.id} onClick={() => handleSubmitInvoice(inv.id)}>
                      اعتماد
                    </button>{' '}
                    <button disabled={busyId === inv.id} onClick={() => handleDeleteDraft(inv.id)}>
                      حذف
                    </button>{' '}
                  </>
                )}
                {canWrite && inv.status === 'Submitted' && (
                  <button disabled={busyId === inv.id} onClick={() => handleCancelInvoice(inv.id)}>
                    إلغاء
                  </button>
                )}{' '}
                <Link to={`/print/sales-invoice/${inv.id}`} target="_blank" rel="noopener noreferrer">
                  طباعة
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {canWrite && (
        <div className="card-form">
          <h3>فاتورة مبيعات جديدة</h3>
          <div className="form-row">
            <label className="grow">
              العميل
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">اختر عميلًا</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              تاريخ الترحيل
              <input type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
            </label>
            <label>
              تاريخ الاستحقاق
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
            <label className="grow">
              ملاحظات
              <input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </label>
          </div>
          <div className="form-row">
            <label>
              نسبة الضريبة %
              <input type="number" step="0.01" min="0" max="100" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
            </label>
            <label className="grow">
              حساب الضريبة
              <select value={taxAccountId} onChange={(e) => setTaxAccountId(e.target.value)}>
                <option value="">بدون ضريبة</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>الصنف</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>الخصم %</th>
                <th>الإجمالي</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx}>
                  <td>
                    <select value={line.item_id} onChange={(e) => updateLine(idx, { item_id: e.target.value })}>
                      <option value="">اختر صنف</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.code} - {it.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input type="number" step="0.01" value={line.qty} onChange={(e) => updateLine(idx, { qty: e.target.value })} />
                  </td>
                  <td>
                    <input type="number" step="0.01" value={line.rate} onChange={(e) => updateLine(idx, { rate: e.target.value })} />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={line.discount_percent}
                      onChange={(e) => updateLine(idx, { discount_percent: e.target.value })}
                    />
                  </td>
                  <td>{lineAmount(line).toFixed(2)}</td>
                  <td>
                    <button type="button" className="link-btn" onClick={() => removeLine(idx)}>
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>المجموع الفرعي</td>
                <td colSpan={2}>{subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan={4}>الضريبة ({taxPercent || 0}%)</td>
                <td colSpan={2}>{taxAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan={4}>الإجمالي شامل الضريبة</td>
                <td colSpan={2}>{total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          <button type="button" className="link-btn" onClick={addLine}>
            + إضافة سطر
          </button>
          <div>
            <button onClick={handleCreateDraft}>حفظ كمسودة</button>
          </div>
        </div>
      )}
    </div>
  )
}
