import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../supabaseClient'
import type { Account, Supplier } from '../types'
import { useAuth } from '../AuthContext'

export default function Suppliers() {
  const { role } = useAuth()
  const canWrite = role === 'admin' || role === 'accountant'
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [error, setError] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [payableAccountId, setPayableAccountId] = useState('')

  async function load() {
    const [{ data: s, error: sErr }, { data: a }] = await Promise.all([
      supabase.from('accounting_suppliers').select('*').order('code'),
      supabase.from('accounts').select('*').eq('account_type', 'Payable'),
    ])
    if (sErr) setError(sErr.message)
    else setSuppliers(s as Supplier[])
    setAccounts((a as Account[]) ?? [])
    if (a && a.length > 0 && !payableAccountId) setPayableAccountId(a[0].id)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.from('accounting_suppliers').insert({
      code,
      name,
      email: email || null,
      phone: phone || null,
      payable_account_id: payableAccountId,
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
      <h1>الموردون</h1>
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
          {suppliers.map((s) => (
            <tr key={s.id}>
              <td>{s.code}</td>
              <td>{s.name}</td>
              <td>{s.email ?? '-'}</td>
              <td>{s.phone ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {canWrite && (
        <form className="card-form" onSubmit={handleCreate}>
          <h3>مورد جديد</h3>
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
              <select value={payableAccountId} onChange={(e) => setPayableAccountId(e.target.value)}>
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
