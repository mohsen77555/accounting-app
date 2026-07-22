import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Account, GeneralLedgerRow } from '../types'

export default function GeneralLedger() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState('')
  const [from, setFrom] = useState(() => new Date().getFullYear() + '-01-01')
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<GeneralLedgerRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('accounts')
      .select('*')
      .eq('is_group', false)
      .order('code')
      .then(({ data }) => setAccounts((data as Account[]) ?? []))
  }, [])

  async function run() {
    setError(null)
    if (!accountId) {
      setError('اختر حسابًا أولاً')
      return
    }
    const { data, error } = await supabase.rpc('fn_general_ledger', {
      p_account_id: accountId,
      p_from: from,
      p_to: to,
    })
    if (error) setError(error.message)
    else setRows(data as GeneralLedgerRow[])
  }

  return (
    <div>
      <h1>دفتر الأستاذ</h1>
      <div className="form-row">
        <label className="grow">
          الحساب
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">اختر حساب</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} - {a.name}
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
