import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../supabaseClient'
import type { Account, RootType } from '../types'
import { useAuth } from '../AuthContext'

const ROOT_TYPES: RootType[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense']

export default function Accounts() {
  const { role } = useAuth()
  const canWrite = role === 'admin' || role === 'accountant'
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [rootType, setRootType] = useState<RootType>('Asset')
  const [parentId, setParentId] = useState('')
  const [isGroup, setIsGroup] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('accounts').select('*').order('code')
    if (error) setError(error.message)
    else setAccounts(data as Account[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.from('accounts').insert({
      code,
      name,
      root_type: rootType,
      parent_id: parentId || null,
      is_group: isGroup,
    })
    if (error) {
      setError(error.message)
      return
    }
    setCode('')
    setName('')
    setParentId('')
    setIsGroup(false)
    load()
  }

  if (loading) return <p>جارٍ التحميل...</p>

  return (
    <div>
      <h1>شجرة الحسابات</h1>
      {error && <div className="error">{error}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>الرمز</th>
            <th>الاسم</th>
            <th>النوع الجذري</th>
            <th>نوع الحساب</th>
            <th>مجمّع؟</th>
            <th>مجمّد؟</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id} className={a.is_group ? 'group-row' : ''}>
              <td>{a.code}</td>
              <td>{a.name}</td>
              <td>{a.root_type}</td>
              <td>{a.account_type ?? '-'}</td>
              <td>{a.is_group ? 'نعم' : '-'}</td>
              <td>{a.is_frozen ? 'مجمّد' : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {canWrite && (
        <form className="card-form" onSubmit={handleCreate}>
          <h3>إضافة حساب جديد</h3>
          <div className="form-row">
            <label>
              الرمز
              <input value={code} onChange={(e) => setCode(e.target.value)} required />
            </label>
            <label>
              الاسم
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
          </div>
          <div className="form-row">
            <label>
              النوع الجذري
              <select value={rootType} onChange={(e) => setRootType(e.target.value as RootType)}>
                {ROOT_TYPES.map((rt) => (
                  <option key={rt} value={rt}>
                    {rt}
                  </option>
                ))}
              </select>
            </label>
            <label>
              الحساب الأب
              <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">(بدون)</option>
                {accounts
                  .filter((a) => a.is_group)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={isGroup} onChange={(e) => setIsGroup(e.target.checked)} />
              حساب مجمّع (Group)
            </label>
          </div>
          <button type="submit">إضافة</button>
        </form>
      )}
    </div>
  )
}
