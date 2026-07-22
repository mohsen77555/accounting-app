import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../AuthContext'

interface ManagedUser {
  id: string
  email: string
  role: string
}

export default function UserManagement() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  const [users, setUsers] = useState<ManagedUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newRole, setNewRole] = useState('viewer')

  async function loadUsers() {
    if (!isAdmin) return
    setError(null)
    const { data, error } = await supabase.functions.invoke('admin-manage-user', {
      body: { action: 'list_users' },
    })
    if (error) setError(error.message)
    else setUsers((data?.users as ManagedUser[]) ?? [])
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('admin-manage-user', {
      body: { action: 'create_user', email, password, role: newRole },
    })
    setBusy(false)
    if (error || data?.error) {
      setError(data?.error ?? error?.message ?? 'تعذر إنشاء المستخدم')
      return
    }
    setInfo(`تم إنشاء المستخدم ${email} بدور ${newRole}`)
    setEmail('')
    setPassword('')
    loadUsers()
  }

  async function handleSetRole(userId: string, role: string) {
    setError(null)
    const { data, error } = await supabase.functions.invoke('admin-manage-user', {
      body: { action: 'set_role', user_id: userId, role },
    })
    if (error || data?.error) {
      setError(data?.error ?? error?.message ?? 'تعذر تحديث الدور')
      return
    }
    loadUsers()
  }

  if (!isAdmin) {
    return (
      <div>
        <h1>إدارة المستخدمين</h1>
        <div className="error">هذه الصفحة تتطلب صلاحية admin</div>
      </div>
    )
  }

  return (
    <div>
      <h1>إدارة المستخدمين والصلاحيات</h1>
      {error && <div className="error">{error}</div>}
      {info && <div className="info">{info}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>البريد الإلكتروني</th>
            <th>الدور</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>
                <select value={u.role} onChange={(e) => handleSetRole(u.id, e.target.value)}>
                  <option value="admin">admin</option>
                  <option value="accountant">accountant</option>
                  <option value="viewer">viewer</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className="card-form" onSubmit={handleCreate}>
        <h3>مستخدم جديد</h3>
        <div className="form-row">
          <label className="grow">
            البريد الإلكتروني
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            كلمة المرور
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <label>
            الدور
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              <option value="admin">admin</option>
              <option value="accountant">accountant</option>
              <option value="viewer">viewer</option>
            </select>
          </label>
        </div>
        <button type="submit" disabled={busy}>
          إنشاء مستخدم
        </button>
      </form>
    </div>
  )
}
