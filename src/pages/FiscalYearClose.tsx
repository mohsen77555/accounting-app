import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Account, FiscalYear, ProfitAndLossRow } from '../types'
import { useAuth } from '../AuthContext'

export default function FiscalYearClose() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([])
  const [equityAccounts, setEquityAccounts] = useState<Account[]>([])
  const [fiscalYearId, setFiscalYearId] = useState('')
  const [retainedEarningsId, setRetainedEarningsId] = useState('')
  const [preview, setPreview] = useState<ProfitAndLossRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const [{ data: fys }, { data: acc }] = await Promise.all([
      supabase.from('fiscal_years').select('*').order('start_date'),
      supabase.from('accounts').select('*').eq('root_type', 'Equity').eq('is_group', false),
    ])
    setFiscalYears((fys as FiscalYear[]) ?? [])
    setEquityAccounts((acc as Account[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function loadPreview(fyId: string) {
    setFiscalYearId(fyId)
    setPreview([])
    const fy = fiscalYears.find((f) => f.id === fyId)
    if (!fy) return
    const { data, error } = await supabase.rpc('fn_profit_and_loss', { p_from: fy.start_date, p_to: fy.end_date })
    if (error) setError(error.message)
    else setPreview(data as ProfitAndLossRow[])
  }

  const netProfit = preview.reduce((s, r) => s + (r.root_type === 'Income' ? Number(r.amount) : -Number(r.amount)), 0)

  async function handleClose() {
    setError(null)
    setInfo(null)
    if (!fiscalYearId || !retainedEarningsId) {
      setError('اختر السنة المالية وحساب الأرباح المرحّلة')
      return
    }
    setBusy(true)
    const { error } = await supabase.rpc('fn_close_fiscal_year', {
      p_fiscal_year_id: fiscalYearId,
      p_retained_earnings_account_id: retainedEarningsId,
    })
    setBusy(false)
    if (error) setError(error.message)
    else {
      setInfo('تم إقفال السنة المالية بنجاح، وتم ترحيل صافي الربح/الخسارة إلى الأرباح المرحّلة.')
      load()
    }
  }

  return (
    <div>
      <h1>إقفال السنة المالية</h1>
      {!isAdmin && <div className="error">هذه الصفحة تتطلب صلاحية admin</div>}
      {error && <div className="error">{error}</div>}
      {info && <div className="info">{info}</div>}

      <div className="form-row">
        <label className="grow">
          السنة المالية
          <select value={fiscalYearId} onChange={(e) => loadPreview(e.target.value)}>
            <option value="">اختر</option>
            {fiscalYears.map((fy) => (
              <option key={fy.id} value={fy.id} disabled={fy.is_closed}>
                {fy.year_name} {fy.is_closed ? '(مقفلة)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="grow">
          حساب الأرباح المرحّلة
          <select value={retainedEarningsId} onChange={(e) => setRetainedEarningsId(e.target.value)}>
            <option value="">اختر</option>
            {equityAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} - {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {preview.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>النوع</th>
              <th>الحساب</th>
              <th>المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((r) => (
              <tr key={r.account_code}>
                <td>{r.root_type}</td>
                <td>{r.account_name}</td>
                <td>{Number(r.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>{netProfit >= 0 ? 'صافي الربح المتوقع ترحيله' : 'صافي الخسارة المتوقع ترحيلها'}</td>
              <td>{netProfit.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      )}

      {isAdmin && (
        <button disabled={busy || !fiscalYearId} onClick={handleClose}>
          إقفال السنة المالية نهائيًا
        </button>
      )}
    </div>
  )
}
