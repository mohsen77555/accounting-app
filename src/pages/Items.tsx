import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../supabaseClient'
import type { Account, Item } from '../types'
import { useAuth } from '../AuthContext'

export default function Items() {
  const { role } = useAuth()
  const canWrite = role === 'admin' || role === 'accountant'
  const [items, setItems] = useState<Item[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [error, setError] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [isStockItem, setIsStockItem] = useState(true)
  const [inventoryAccountId, setInventoryAccountId] = useState('')
  const [incomeAccountId, setIncomeAccountId] = useState('')
  const [cogsAccountId, setCogsAccountId] = useState('')
  const [expenseAccountId, setExpenseAccountId] = useState('')

  async function load() {
    const [{ data: it, error: itErr }, { data: a }] = await Promise.all([
      supabase.from('accounting_items').select('*').order('code'),
      supabase.from('accounts').select('*').eq('is_group', false).order('code'),
    ])
    if (itErr) setError(itErr.message)
    else setItems(it as Item[])
    setAccounts((a as Account[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.from('accounting_items').insert({
      code,
      name,
      is_stock_item: isStockItem,
      inventory_account_id: isStockItem ? inventoryAccountId || null : null,
      income_account_id: incomeAccountId || null,
      cogs_account_id: isStockItem ? cogsAccountId || null : null,
      expense_account_id: !isStockItem ? expenseAccountId || null : null,
    })
    if (error) {
      setError(error.message)
      return
    }
    setCode('')
    setName('')
    load()
  }

  return (
    <div>
      <h1>الأصناف</h1>
      {error && <div className="error">{error}</div>}
      <table className="data-table">
        <thead>
          <tr>
            <th>الرمز</th>
            <th>الاسم</th>
            <th>مخزني؟</th>
            <th>الكمية</th>
            <th>سعر التكلفة</th>
            <th>قيمة المخزون</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td>{it.code}</td>
              <td>{it.name}</td>
              <td>{it.is_stock_item ? 'نعم' : 'لا (خدمة)'}</td>
              <td>{it.is_stock_item ? it.qty_on_hand : '-'}</td>
              <td>{it.is_stock_item ? it.valuation_rate : '-'}</td>
              <td>{it.is_stock_item ? (it.qty_on_hand * it.valuation_rate).toFixed(2) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {canWrite && (
        <form className="card-form" onSubmit={handleCreate}>
          <h3>صنف جديد</h3>
          <div className="form-row">
            <label>
              الرمز
              <input value={code} onChange={(e) => setCode(e.target.value)} required />
            </label>
            <label className="grow">
              الاسم
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={isStockItem} onChange={(e) => setIsStockItem(e.target.checked)} />
              صنف مخزني
            </label>
          </div>
          <div className="form-row">
            <label>
              حساب الإيراد
              <select value={incomeAccountId} onChange={(e) => setIncomeAccountId(e.target.value)}>
                <option value="">اختر</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </label>
            {isStockItem ? (
              <>
                <label>
                  حساب المخزون
                  <select value={inventoryAccountId} onChange={(e) => setInventoryAccountId(e.target.value)}>
                    <option value="">اختر</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  حساب تكلفة البضاعة المباعة
                  <select value={cogsAccountId} onChange={(e) => setCogsAccountId(e.target.value)}>
                    <option value="">اختر</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <label>
                حساب المصروف
                <select value={expenseAccountId} onChange={(e) => setExpenseAccountId(e.target.value)}>
                  <option value="">اختر</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <button type="submit">إضافة</button>
        </form>
      )}
    </div>
  )
}
