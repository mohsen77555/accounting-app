import { useState } from 'react'
import { supabase } from '../supabaseClient'
import type { ProfitAndLossRow } from '../types'

export default function ProfitAndLoss() {
  const [from, setFrom] = useState(() => new Date().getFullYear() + '-01-01')
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<ProfitAndLossRow[]>([])
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setError(null)
    const { data, error } = await supabase.rpc('fn_profit_and_loss', { p_from: from, p_to: to })
    if (error) setError(error.message)
    else setRows(data as ProfitAndLossRow[])
  }

  const income = rows.filter((r) => r.root_type === 'Income')
  const expense = rows.filter((r) => r.root_type === 'Expense')
  const totalIncome = income.reduce((s, r) => s + Number(r.amount), 0)
  const totalExpense = expense.reduce((s, r) => s + Number(r.amount), 0)
  const net = totalIncome - totalExpense

  return (
    <div>
      <h1>قائمة الدخل (الأرباح والخسائر)</h1>
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

      <h3>الإيرادات</h3>
      <table className="data-table">
        <tbody>
          {income.map((r) => (
            <tr key={r.account_code}>
              <td>{r.account_code}</td>
              <td>{r.account_name}</td>
              <td>{Number(r.amount).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>إجمالي الإيرادات</td>
            <td>{totalIncome.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <h3>المصروفات</h3>
      <table className="data-table">
        <tbody>
          {expense.map((r) => (
            <tr key={r.account_code}>
              <td>{r.account_code}</td>
              <td>{r.account_name}</td>
              <td>{Number(r.amount).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>إجمالي المصروفات</td>
            <td>{totalExpense.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <h2>{net >= 0 ? `صافي الربح: ${net.toFixed(2)}` : `صافي الخسارة: ${Math.abs(net).toFixed(2)}`}</h2>
    </div>
  )
}
