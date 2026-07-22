import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Customer, GeneralLedgerRow } from '../types'

export default function CustomerStatement() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState('')
  const [from, setFrom] = useState(() => new Date().getFullYear() + '-01-01')
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<GeneralLedgerRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('accounting_customers')
      .select('*')
      .order('code')
      .then(({ data }) => setCustomers((data as Customer[]) ?? []))
  }, [])

  async function run() {
    setError(null)
    if (!customerId) {
      setError('اختر عميلًا أولاً')
      return
    }
    const { data, error } = await supabase.rpc('fn_customer_statement', {
      p_customer_id: customerId,
      p_from: from,
      p_to: to,
    })
    if (error) setError(error.message)
    else setRows(data as GeneralLedgerRow[])
  }

  return (
    <div>
      <h1>كشف حساب عميل</h1>
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
          من
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          إلى
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button onClick={run}>عرض</button>
      </div>
      {error && <div className="error">{error}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>رقم القيد</th>
            <th>البيان</th>
            <th>مدين</th>
            <th>دائن</th>
            <th>الرصيد التراكمي</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.posting_date}</td>
              <td>{r.entry_number}</td>
              <td>{r.remarks}</td>
              <td>{Number(r.debit).toFixed(2)}</td>
              <td>{Number(r.credit).toFixed(2)}</td>
              <td>{Number(r.running_balance).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
