import { useState, type FormEvent } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        console.error('Supabase auth error:', error)
        const detail = error.message && error.message !== '{}' ? error.message : JSON.stringify(error, Object.getOwnPropertyNames(error))
        setError(`${error.name ?? 'Error'} (${error.status ?? '?'}): ${detail}`)
      }
    } catch (e) {
      console.error('signInWithPassword threw:', e)
      const detail = e instanceof Error ? `${e.name}: ${e.message}` : JSON.stringify(e)
      setError(`استثناء غير متوقع: ${detail}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>نظام المحاسبة</h1>
        <p className="muted">تسجيل الدخول للمتابعة</p>
        <label>
          البريد الإلكتروني
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          كلمة المرور
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'جارٍ الدخول...' : 'دخول'}
        </button>
        <p className="muted" style={{ wordBreak: 'break-all' }}>
          URL: {import.meta.env.VITE_SUPABASE_URL ? 'موجود ✅' : 'مفقود ❌'} | Key:{' '}
          {import.meta.env.VITE_SUPABASE_ANON_KEY ? `موجود (${(import.meta.env.VITE_SUPABASE_ANON_KEY as string).length} حرف) ✅` : 'مفقود ❌'}
        </p>
      </form>
    </div>
  )
}
