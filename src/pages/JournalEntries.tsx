import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Account, JournalEntry } from '../types'
import { useAuth } from '../AuthContext'

interface LineDraft {
  account_id: string
  debit: string
  credit: string
  description: string
}

function emptyLine(): LineDraft {
  return { account_id: '', debit: '', credit: '', description: '' }
}

export default function JournalEntries() {
  const { role } = useAuth()
  const canWrite = role === 'admin' || role === 'accountant'

  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [remarks, setRemarks] = useState('')
  const [lines, setLines] = useState<LineDraft[]>([emptyLine(), emptyLine()])

  async function load() {
    const [{ data: je, error: jeErr }, { data: acc, error: accErr }] = await Promise.all([
      supabase.from('journal_entries').select('*').order('created_at', { ascending: false }),
      supabase.from('accounts').select('*').eq('is_group', false).order('code'),
    ])
    if (jeErr) setError(jeErr.message)
    else setEntries(je as JournalEntry[])
    if (accErr) setError(accErr.message)
    else setAccounts(acc as Account[])
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

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0)
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0)

  async function handleCreateDraft() {
    setError(null)
    setInfo(null)
    const validLines = lines.filter((l) => l.account_id && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
    if (validLines.length < 2) {
      setError('أدخل سطرين على الأقل ببنود صحيحة')
      return
    }

    const { data: je, error: jeErr } = await supabase
      .from('journal_entries')
      .insert({ posting_date: postingDate, remarks })
      .select()
      .single()
    if (jeErr || !je) {
      setError(jeErr?.message ?? 'تعذر إنشاء القيد')
      return
    }

    const rows = validLines.map((l, i) => ({
      journal_entry_id: je.id,
      line_no: i + 1,
      account_id: l.account_id,
      debit: parseFloat(l.debit) || 0,
      credit: parseFloat(l.credit) || 0,
      description: l.description || null,
    }))
    const { error: linesErr } = await supabase.from('journal_entry_lines').insert(rows)
    if (linesErr) {
      setError(linesErr.message)
      return
    }

    setInfo(`تم إنشاء المسودة ${je.entry_number}`)
    setRemarks('')
    setLines([emptyLine(), emptyLine()])
    load()
  }

  async function handleSubmitEntry(id: string) {
    setBusyId(id)
    setError(null)
    const { error } = await supabase.rpc('fn_submit_journal_entry', { p_je_id: id })
    setBusyId(null)
    if (error) setError(error.message)
    else load()
  }

  async function handleCancelEntry(id: string) {
    setBusyId(id)
    setError(null)
    const { error } = await supabase.rpc('fn_cancel_journal_entry', { p_je_id: id })
    setBusyId(null)
    if (error) setError(error.message)
    else load()
  }

  async function handleDeleteDraft(id: string) {
    setBusyId(id)
    setError(null)
    const { error } = await supabase.from('journal_entries').delete().eq('id', id)
    setBusyId(null)
    if (error) setError(error.message)
    else load()
  }

  return (
    <div>
      <h1>القيود اليومية</h1>
      {error && <div className="error">{error}</div>}
      {info && <div className="info">{info}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>الرقم</th>
            <th>التاريخ</th>
            <th>البيان</th>
            <th>الحالة</th>
            <th>مدين</th>
            <th>دائن</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((je) => (
            <tr key={je.id}>
              <td>{je.entry_number}</td>
              <td>{je.posting_date}</td>
              <td>{je.remarks}</td>
              <td>
                <span className={`status-pill status-${je.status.toLowerCase()}`}>{je.status}</span>
              </td>
              <td>{je.total_debit}</td>
              <td>{je.total_credit}</td>
              <td>
                {canWrite && je.status === 'Draft' && (
                  <>
                    <button disabled={busyId === je.id} onClick={() => handleSubmitEntry(je.id)}>
                      اعتماد
                    </button>{' '}
                    <button disabled={busyId === je.id} onClick={() => handleDeleteDraft(je.id)}>
                      حذف
                    </button>
                  </>
                )}
                {canWrite && je.status === 'Submitted' && (
                  <button disabled={busyId === je.id} onClick={() => handleCancelEntry(je.id)}>
                    إلغاء (قيد عكسي)
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {canWrite && (
        <div className="card-form">
          <h3>قيد جديد (مسودة)</h3>
          <div className="form-row">
            <label>
              تاريخ الترحيل
              <input type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
            </label>
            <label className="grow">
              البيان
              <input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </label>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>الحساب</th>
                <th>مدين</th>
                <th>دائن</th>
                <th>وصف</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx}>
                  <td>
                    <select value={line.account_id} onChange={(e) => updateLine(idx, { account_id: e.target.value })}>
                      <option value="">اختر حساب</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={line.debit}
                      onChange={(e) => updateLine(idx, { debit: e.target.value, credit: '' })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={line.credit}
                      onChange={(e) => updateLine(idx, { credit: e.target.value, debit: '' })}
                    />
                  </td>
                  <td>
                    <input value={line.description} onChange={(e) => updateLine(idx, { description: e.target.value })} />
                  </td>
                  <td>
                    <button type="button" className="link-btn" onClick={() => removeLine(idx)}>
                      حذف السطر
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>الإجمالي</td>
                <td>{totalDebit.toFixed(2)}</td>
                <td>{totalCredit.toFixed(2)}</td>
                <td colSpan={2}>{totalDebit === totalCredit ? '✅ متوازن' : '⚠️ غير متوازن'}</td>
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
