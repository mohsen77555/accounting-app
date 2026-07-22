import { useState } from 'react'
import { supabase } from '../supabaseClient'
import type { TrialBalanceRow } from '../types'

export default function TrialBalance() {
  const [from, setFrom] = useState(() => new Date().getFullYear() + '-01-01')
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<TrialBalanceRow[]>([])
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setError(null)
    const { data, error } = await supabase.rpc('fn_trial_balance', { p_from: from, p_to: to })
    if (error) setError(error.message)
    else setRows(data as TrialBalanceRow[])
  }

  const totalDebit = rows.reduce((s, r) => s + Number(r.debit), 0)
  const totalCredit = rows.reduce((s, r) => s + Number(r.credit), 0)

  return (
    <div>
      <h1>ميزان المراجعة</h1>
      <div className="form-row">
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
            <th>الرمز</th>
            <th>الحساب</th>
            <th>رصيد افتتاحي</th>
            <th>مدين</th>
            <th>دائن</th>
            <th>رصيد ختامي</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.account_id}>
              <td>{r.account_code}</td>
              <td>{r.account_name}</td>
              <td>{Number(r.opening_balance).toFixed(2)}</td>
              <td>{Number(r.debit).toFixed(2)}</td>
              <td>{Number(r.credit).toFixed(2)}</td>
              <td>{Number(r.closing_balance).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>الإجمالي</td>
            <td>{totalDebit.toFixed(2)}</td>
            <td>{totalCredit.toFixed(2)}</td>
            <td>{totalDebit.toFixed(2) === totalCredit.toFixed(2) ? '✅ متوازن' : '⚠️ غير متوازن'}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
