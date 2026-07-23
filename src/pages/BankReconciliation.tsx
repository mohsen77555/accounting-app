import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../supabaseClient'
import type { Account, BankStatementLine } from '../types'
import { useAuth } from '../AuthContext'

interface GlEntryRow {
  id: string
  posting_date: string
  debit: number
  credit: number
  remarks: string | null
  journal_entries: { entry_number: string } | { entry_number: string }[] | null
}

export default function BankReconciliation() {
  const { role } = useAuth()
  const canWrite = role === 'admin' || role === 'accountant'

  const [bankAccounts, setBankAccounts] = useState<Account[]>([])
  const [bankAccountId, setBankAccountId] = useState('')
  const [statementLines, setStatementLines] = useState<BankStatementLine[]>([])
  const [glEntries, setGlEntries] = useState<GlEntryRow[]>([])
  const [selectedGl, setSelectedGl] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [statementDate, setStatementDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [reference, setReference] = useState('')
  const [amount, setAmount] = useState('')

  useEffect(() => {
    supabase
      .from('accounts')
      .select('*')
      .in('account_type', ['Bank', 'Cash'])
      .then(({ data }) => setBankAccounts((data as Account[]) ?? []))
  }, [])

  async function load(accountId: string) {
    if (!accountId) return
    const [{ data: lines, error: linesErr }, { data: gl }] = await Promise.all([
      supabase
        .from('accounting_bank_statement_lines')
        .select('*')
        .eq('bank_account_id', accountId)
        .eq('is_matched', false)
        .order('statement_date'),
      supabase
        .from('gl_entries')
        .select('id, posting_date, debit, credit, remarks, journal_entries(entry_number)')
        .eq('account_id', accountId)
        .eq('is_cancelled', false)
        .eq('is_reconciled', false)
        .order('posting_date'),
    ])
    if (linesErr) setError(linesErr.message)
    else setStatementLines((lines as BankStatementLine[]) ?? [])
    setGlEntries((gl as GlEntryRow[]) ?? [])
  }

  useEffect(() => {
    load(bankAccountId)
  }, [bankAccountId])

  function glLabel(g: GlEntryRow) {
    const entryNumber = Array.isArray(g.journal_entries) ? g.journal_entries[0]?.entry_number : g.journal_entries?.entry_number
    const signed = Number(g.debit) - Number(g.credit)
    return `${entryNumber ?? ''} | ${g.posting_date} | ${signed.toFixed(2)} | ${g.remarks ?? ''}`
  }

  async function handleAddLine(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!bankAccountId || !amount) {
      setError('اختر حساب البنك وأدخل المبلغ')
      return
    }
    const { error } = await supabase.from('accounting_bank_statement_lines').insert({
      bank_account_id: bankAccountId,
      statement_date: statementDate,
      description: description || null,
      reference: reference || null,
      amount: parseFloat(amount),
    })
    if (error) {
      setError(error.message)
      return
    }
    setDescription('')
    setReference('')
    setAmount('')
    load(bankAccountId)
  }

  async function handleMatch(lineId: string) {
    const glId = selectedGl[lineId]
    if (!glId) {
      setError('اختر قيد دفتر أستاذ لمطابقته')
      return
    }
    setBusyId(lineId)
    setError(null)
    const { error } = await supabase.rpc('fn_match_bank_line', { p_statement_line_id: lineId, p_gl_entry_id: glId })
    setBusyId(null)
    if (error) setError(error.message)
    else load(bankAccountId)
  }

  async function handleDeleteLine(lineId: string) {
    setBusyId(lineId)
    setError(null)
    const { error } = await supabase.from('accounting_bank_statement_lines').delete().eq('id', lineId)
    setBusyId(null)
    if (error) setError(error.message)
    else load(bankAccountId)
  }

  return (
    <div>
      <h1>التسوية البنكية</h1>
      {error && <div className="error">{error}</div>}

      <div className="form-row">
        <label className="grow">
          حساب البنك/الصندوق
          <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
            <option value="">اختر حسابًا</option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} - {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {bankAccountId && (
        <>
          <h3>حركات كشف الحساب غير المطابَقة</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>البيان</th>
                <th>المرجع</th>
                <th>المبلغ</th>
                <th>مطابقة مع قيد دفتر الأستاذ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {statementLines.map((line) => (
                <tr key={line.id}>
                  <td>{line.statement_date}</td>
                  <td>{line.description}</td>
                  <td>{line.reference}</td>
                  <td>{Number(line.amount).toFixed(2)}</td>
                  <td>
                    {canWrite && (
                      <select
                        value={selectedGl[line.id] ?? ''}
                        onChange={(e) => setSelectedGl((prev) => ({ ...prev, [line.id]: e.target.value }))}
                      >
                        <option value="">اختر قيدًا</option>
                        {glEntries
                          .filter((g) => Number(g.debit) - Number(g.credit) === Number(line.amount))
                          .map((g) => (
                            <option key={g.id} value={g.id}>
                              {glLabel(g)}
                            </option>
                          ))}
                      </select>
                    )}
                  </td>
                  <td>
                    {canWrite && (
                      <>
                        <button disabled={busyId === line.id} onClick={() => handleMatch(line.id)}>
                          مطابقة
                        </button>{' '}
                        <button disabled={busyId === line.id} onClick={() => handleDeleteLine(line.id)}>
                          حذف
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>قيود دفتر الأستاذ غير المطابَقة لهذا الحساب</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>رقم القيد</th>
                <th>التاريخ</th>
                <th>الصافي (مدين-دائن)</th>
                <th>البيان</th>
              </tr>
            </thead>
            <tbody>
              {glEntries.map((g) => (
                <tr key={g.id}>
                  <td>{Array.isArray(g.journal_entries) ? g.journal_entries[0]?.entry_number : g.journal_entries?.entry_number}</td>
                  <td>{g.posting_date}</td>
                  <td>{(Number(g.debit) - Number(g.credit)).toFixed(2)}</td>
                  <td>{g.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {canWrite && (
            <form className="card-form" onSubmit={handleAddLine}>
              <h3>إضافة حركة من كشف الحساب البنكي</h3>
              <div className="form-row">
                <label>
                  التاريخ
                  <input type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} />
                </label>
                <label className="grow">
                  البيان
                  <input value={description} onChange={(e) => setDescription(e.target.value)} />
                </label>
                <label>
                  المرجع
                  <input value={reference} onChange={(e) => setReference(e.target.value)} />
                </label>
                <label>
                  المبلغ (سالب = سحب، موجب = إيداع)
                  <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </label>
              </div>
              <button type="submit">إضافة</button>
            </form>
          )}
        </>
      )}
    </div>
  )
}
