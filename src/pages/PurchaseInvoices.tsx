import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Item, PurchaseInvoice, Supplier } from '../types'
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

export default function PurchaseInvoices() {
  const { role } = useAuth()
  const canWrite = role === 'admin' || role === 'accountant'

  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [supplierId, setSupplierId] = useState('')
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [remarks, setRemarks] = useState('')
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()])

  async function load() {
    const [{ data: inv, error: invErr }, { data: supp }, { data: it }] = await Promise.all([
      supabase.from('accounting_purchase_invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('accounting_suppliers').select('*').order('code'),
      supabase.from('accounting_items').select('*').order('code'),
    ])
    if (invErr) setError(invErr.message)
    else setInvoices(inv as PurchaseInvoice[])
    setSuppliers((supp as Supplier[]) ?? [])
    setItems((it as Item[]) ?? [])
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

  const total = lines.reduce((sum, l) => sum + lineAmount(l), 0)

  async function handleCreateDraft() {
    setError(null)
    if (!supplierId) {
      setError('اختر موردًا')
      return
    }
    const validLines = lines.filter((l) => l.item_id && parseFloat(l.qty) > 0)
    if (validLines.length === 0) {
      setError('أضف سطرًا واحدًا على الأقل')
      return
    }

    const { data: inv, error: invErr } = await supabase
      .from('accounting_purchase_invoices')
      .insert({ supplier_id: supplierId, posting_date: postingDate, due_date: dueDate || null, remarks })
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
    const { error: linesErr } = await supabase.from('accounting_purchase_invoice_items').insert(rows)
    if (linesErr) {
      setError(linesErr.message)
      return
    }

    setRemarks('')
    setDueDate('')
    setLines([emptyLine()])
    load()
  }

  async function handleSubmitInvoice(id: string) {
    setBusyId(id)
    setError(null)
    const { error } = await supabase.rpc('fn_submit_purchase_invoice', { p_invoice_id: id })
    setBusyId(null)
    if (error) setError(error.message)
    else load()
  }

  async function handleCancelInvoice(id: string) {
    setBusyId(id)
    setError(null)
    const { error } = await supabase.rpc('fn_cancel_purchase_invoice', { p_invoice_id: id })
    setBusyId(null)
    if (error) setError(error.message)
    else load()
  }

  async function handleDeleteDraft(id: string) {
    setBusyId(id)
    setError(null)
    const { error } = await supabase.from('accounting_purchase_invoices').delete().eq('id', id)
    setBusyId(null)
    if (error) setError(error.message)
    else load()
  }

  function supplierName(id: string) {
    return suppliers.find((s) => s.id === id)?.name ?? id
  }

  return (
    <div>
      <h1>فواتير المشتريات</h1>
      {error && <div className="error">{error}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>الرقم</th>
            <th>المورد</th>
            <th>التاريخ</th>
            <th>الحالة</th>
            <th>الإجمالي</th>
            <th>المتبقي</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td>{inv.invoice_number}</td>
              <td>{supplierName(inv.supplier_id)}</td>
              <td>{inv.posting_date}</td>
              <td>
                <span className={`status-pill status-${inv.status.toLowerCase()}`}>{inv.status}</span>
              </td>
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
                    </button>
                  </>
                )}
                {canWrite && inv.status === 'Submitted' && (
                  <button disabled={busyId === inv.id} onClick={() => handleCancelInvoice(inv.id)}>
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
          <h3>فاتورة مشتريات جديدة</h3>
          <div className="form-row">
            <label className="grow">
              المورد
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">اختر موردًا</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
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
                <td colSpan={4}>الإجمالي</td>
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
