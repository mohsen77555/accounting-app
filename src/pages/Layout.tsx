import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'

export default function Layout() {
  const { session, role } = useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>المحاسبة</h2>
        <nav>
          <NavLink to="/accounts">شجرة الحسابات</NavLink>
          <NavLink to="/journal-entries">القيود اليومية</NavLink>
          <NavLink to="/customers">العملاء</NavLink>
          <NavLink to="/suppliers">الموردون</NavLink>
          <NavLink to="/items">الأصناف</NavLink>
          <NavLink to="/sales-invoices">فواتير المبيعات</NavLink>
          <NavLink to="/purchase-invoices">فواتير المشتريات</NavLink>
          <NavLink to="/payment-entries">سندات القبض/الصرف</NavLink>
          <NavLink to="/reports/general-ledger">دفتر الأستاذ</NavLink>
          <NavLink to="/reports/trial-balance">ميزان المراجعة</NavLink>
          <NavLink to="/reports/profit-and-loss">قائمة الدخل</NavLink>
          <NavLink to="/reports/balance-sheet">الميزانية العمومية</NavLink>
          <NavLink to="/reports/customer-statement">كشف حساب عميل</NavLink>
          <NavLink to="/reports/supplier-statement">كشف حساب مورد</NavLink>
          <NavLink to="/reports/ar-aging">أعمار ديون العملاء</NavLink>
          <NavLink to="/reports/ap-aging">أعمار ديون الموردين</NavLink>
          <NavLink to="/reports/stock-valuation">تقييم المخزون</NavLink>
          <NavLink to="/bank-reconciliation">التسوية البنكية</NavLink>
          <NavLink to="/fiscal-year-close">إقفال السنة المالية</NavLink>
          <NavLink to="/users">إدارة المستخدمين</NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="muted">{session?.user.email}</div>
          <div className="badge">{role ?? '...'}</div>
          <button className="link-btn" onClick={() => supabase.auth.signOut()}>
            تسجيل الخروج
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
