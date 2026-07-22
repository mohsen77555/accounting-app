import { useState } from 'react'
import { supabase } from '../supabaseClient'
import type { AgingRow } from '../types'

export default function APAging() {
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<AgingRow[]>([])
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setError(null)
    const { data, error } = await supabase.rpc('fn_ap_aging', { p_as_of: asOf })
    if (error) setError(error.message)
    else setRows(data as AgingRow[])
  }

  const total = rows.reduce((s, r) => s + Number(r.outstanding_amount), 0)

  return (
    <div>
      <h1>أعمار ديون الموردين</h1>
      <div className="form-row">
        <label>
          كما في تاريخ
          <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </label>
        <button onClick={run}>عرض</button>
      </div>
      {error && <div className="error">{error}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>المورد</th>
            <th>الفاتورة</th>
            <th>تاريخ الترحيل</th>
            <th>تاريخ الاستحقاق</th>
            <th>المتبقي</th>
            <th>أيام التأخير</th>
            <th>الفئة</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.supplier_name}</td>
              <td>{r.invoice_number}</td>
              <td>{r.posting_date}</td>
              <td>{r.due_date ?? '-'}</td>
              <td>{Number(r.outstanding_amount).toFixed(2)}</td>
              <td>{r.days_overdue}</td>
              <td>{r.bucket}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4}>الإجمالي</td>
            <td>{total.toFixed(2)}</td>
            <td colSpan={2}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
