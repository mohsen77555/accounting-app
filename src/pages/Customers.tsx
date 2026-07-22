import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../supabaseClient'
import type { Account, Customer } from '../types'
import { useAuth } from '../AuthContext'

export default function Customers() {
  const { role } = useAuth()
  const canWrite = role === 'admin' || role === 'accountant'
  const [customers, setCustomers] = useState<Customer[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [error, setError] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [receivableAccountId, setReceivableAccountId] = useState('')

  async function load() {
    const [{ data: c, error: cErr }, { data: a }] = await Promise.all([
      supabase.from('accounting_customers').select('*').order('code'),
      supabase.from('accounts').select('*').eq('account_type', 'Receivable'),
    ])
    if (cErr) setError(cErr.message)
    else setCustomers(c as Customer[])
    setAccounts((a as Account[]) ?? [])
    if (a && a.length > 0 && !receivableAccountId) setReceivableAccountId(a[0].id)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.from('accounting_customers').insert({
      code,
      name,
      email: email || null,
      phone: phone || null,
      receivable_account_id: receivableAccountId,
    })
    if (error) {
      setError(error.message)
      return
    }
    setCode('')
    setName('')
    setEmail('')
    setPhone('')
    load()
  }

  return (
    <div>
      <h1>العملاء</h1>
      {error && <div className="error">{error}</div>}
      <table className="data-table">
        <thead>
          <tr>
            <th>الرمز</th>
            <th>الاسم</th>
            <th>البريد</th>
            <th>الهاتف</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id}>
              <td>{c.code}</td>
              <td>{c.name}</td>
              <td>{c.email ?? '-'}</td>
              <td>{c.phone ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {canWrite && (
        <form className="card-form" onSubmit={handleCreate}>
          <h3>عميل جديد</h3>
          <div className="form-row">
            <label>
              الرمز
              <input value={code} onChange={(e) => setCode(e.target.value)} required />
            </label>
            <label className="grow">
              الاسم
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
          </div>
          <div className="form-row">
            <label>
              البريد الإلكتروني
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              الهاتف
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              حساب الذمم
              <select value={receivableAccountId} onChange={(e) => setReceivableAccountId(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit">إضافة</button>
        </form>
      )}
    </div>
  )
}
