import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import type { Customer, Item, SalesInvoice } from '../types'

interface LineRow {
  line_no: number
  qty: number
  rate: number
  discount_percent: number
  amount: number
  item_id: string
}

export default function PrintSalesInvoice() {
  const { id } = useParams()
  const [invoice, setInvoice] = useState<SalesInvoice | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [lines, setLines] = useState<LineRow[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    async function load() {
      const { data: inv, error: invErr } = await supabase
        .from('accounting_sales_invoices')
        .select('*')
        .eq('id', id)
        .single()
      if (invErr || !inv) {
        setError(invErr?.message ?? 'الفاتورة غير موجودة')
        return
      }
      setInvoice(inv as SalesInvoice)

      const [{ data: cust }, { data: lineRows }, { data: allItems }] = await Promise.all([
        supabase.from('accounting_customers').select('*').eq('id', inv.customer_id).single(),
        supabase.from('accounting_sales_invoice_items').select('*').eq('invoice_id', id).order('line_no'),
        supabase.from('accounting_items').select('*'),
      ])
      setCustomer((cust as Customer) ?? null)
      setLines((lineRows as LineRow[]) ?? [])
      setItems((allItems as Item[]) ?? [])
    }
    load()
  }, [id])

  function itemLabel(itemId: string) {
    const it = items.find((i) => i.id === itemId)
    return it ? `${it.code} - ${it.name}` : itemId
  }

  if (error) return <div className="error">{error}</div>
  if (!invoice) return <p className="center-text">جارٍ التحميل...</p>

  const subtotal = lines.reduce((s, l) => s + Number(l.amount), 0)

  return (
    <div className="print-page">
      <div className="print-toolbar no-print">
        <button onClick={() => window.print()}>طباعة / حفظ PDF</button>
      </div>
      <div className="print-invoice">
        <h1>فاتورة مبيعات</h1>
        <div className="print-meta">
          <div>
            <strong>رقم الفاتورة:</strong> {invoice.invoice_number}
          </div>
          <div>
            <strong>التاريخ:</strong> {invoice.posting_date}
          </div>
          {invoice.due_date && (
            <div>
              <strong>تاريخ الاستحقاق:</strong> {invoice.due_date}
            </div>
          )}
          <div>
            <strong>الحالة:</strong> {invoice.status}
          </div>
        </div>
        <div className="print-party">
          <strong>العميل:</strong> {customer?.name} ({customer?.code})
          {customer?.email && <div>{customer.email}</div>}
          {customer?.phone && <div>{customer.phone}</div>}
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th>#</th>
              <th>الصنف</th>
              <th>الكمية</th>
              <th>السعر</th>
              <th>الخصم %</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.line_no}>
                <td>{l.line_no}</td>
                <td>{itemLabel(l.item_id)}</td>
                <td>{Number(l.qty)}</td>
                <td>{Number(l.rate).toFixed(2)}</td>
                <td>{Number(l.discount_percent)}</td>
                <td>{Number(l.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="print-totals">
          <div>
            <span>المجموع الفرعي</span>
            <span>{subtotal.toFixed(2)}</span>
          </div>
          <div>
            <span>الضريبة ({Number(invoice.tax_percent)}%)</span>
            <span>{Number(invoice.tax_amount).toFixed(2)}</span>
          </div>
          <div className="print-total-grand">
            <span>الإجمالي</span>
            <span>{Number(invoice.total_amount).toFixed(2)}</span>
          </div>
          <div>
            <span>المتبقي</span>
            <span>{Number(invoice.outstanding_amount).toFixed(2)}</span>
          </div>
        </div>

        {invoice.remarks && (
          <div className="print-remarks">
            <strong>ملاحظات:</strong> {invoice.remarks}
          </div>
        )}
      </div>
    </div>
  )
}
