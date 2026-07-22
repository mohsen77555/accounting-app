import { useState } from 'react'
import { supabase } from '../supabaseClient'
import type { BalanceSheetRow } from '../types'

export default function BalanceSheet() {
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<BalanceSheetRow[]>([])
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setError(null)
    const { data, error } = await supabase.rpc('fn_balance_sheet', { p_as_of: asOf })
    if (error) setError(error.message)
    else setRows(data as BalanceSheetRow[])
  }

  const assets = rows.filter((r) => r.root_type === 'Asset')
  const liabilities = rows.filter((r) => r.root_type === 'Liability')
  const equity = rows.filter((r) => r.root_type === 'Equity')
  const totalAssets = assets.reduce((s, r) => s + Number(r.balance), 0)
  const totalLiabilities = liabilities.reduce((s, r) => s + Number(r.balance), 0) * -1
  const totalEquity = equity.reduce((s, r) => s + Number(r.balance), 0) * -1

  return (
    <div>
      <h1>الميزانية العمومية</h1>
      <div className="form-row">
        <label>
          كما في تاريخ
          <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </label>
        <button onClick={run}>عرض</button>
      </div>
      {error && <div className="error">{error}</div>}

      <div className="bs-columns">
        <div>
          <h3>الأصول</h3>
          <table className="data-table">
            <tbody>
              {assets.map((r) => (
                <tr key={r.account_code}>
                  <td>{r.account_code}</td>
                  <td>{r.account_name}</td>
                  <td>{Number(r.balance).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>إجمالي الأصول</td>
                <td>{totalAssets.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div>
          <h3>الخصوم</h3>
          <table className="data-table">
            <tbody>
              {liabilities.map((r) => (
                <tr key={r.account_code}>
                  <td>{r.account_code}</td>
                  <td>{r.account_name}</td>
                  <td>{(Number(r.balance) * -1).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>إجمالي الخصوم</td>
                <td>{totalLiabilities.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <h3>حقوق الملكية</h3>
          <table className="data-table">
            <tbody>
              {equity.map((r) => (
                <tr key={r.account_code}>
                  <td>{r.account_code}</td>
                  <td>{r.account_name}</td>
                  <td>{(Number(r.balance) * -1).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>إجمالي حقوق الملكية</td>
                <td>{totalEquity.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <h2>
        {totalAssets.toFixed(2) === (totalLiabilities + totalEquity).toFixed(2)
          ? '✅ الميزانية متوازنة (الأصول = الخصوم + حقوق الملكية)'
          : '⚠️ الميزانية غير متوازنة'}
      </h2>
    </div>
  )
}
