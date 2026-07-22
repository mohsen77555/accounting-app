import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { StockValuationRow } from '../types'

export default function StockValuation() {
  const [rows, setRows] = useState<StockValuationRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.rpc('fn_stock_valuation').then(({ data, error }) => {
      if (error) setError(error.message)
      else setRows(data as StockValuationRow[])
    })
  }, [])

  const total = rows.reduce((s, r) => s + Number(r.stock_value), 0)

  return (
    <div>
      <h1>تقييم المخزون</h1>
      {error && <div className="error">{error}</div>}
      <table className="data-table">
        <thead>
          <tr>
            <th>الرمز</th>
            <th>الصنف</th>
            <th>الكمية</th>
            <th>سعر التكلفة</th>
            <th>القيمة</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.item_code}>
              <td>{r.item_code}</td>
              <td>{r.item_name}</td>
              <td>{Number(r.qty_on_hand).toFixed(2)}</td>
              <td>{Number(r.valuation_rate).toFixed(2)}</td>
              <td>{Number(r.stock_value).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4}>إجمالي قيمة المخزون</td>
            <td>{total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
