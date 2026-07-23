import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import Login from './pages/Login'
import Layout from './pages/Layout'
import Accounts from './pages/Accounts'
import JournalEntries from './pages/JournalEntries'
import GeneralLedger from './pages/GeneralLedger'
import TrialBalance from './pages/TrialBalance'
import ProfitAndLoss from './pages/ProfitAndLoss'
import BalanceSheet from './pages/BalanceSheet'
import Customers from './pages/Customers'
import Suppliers from './pages/Suppliers'
import Items from './pages/Items'
import SalesInvoices from './pages/SalesInvoices'
import PurchaseInvoices from './pages/PurchaseInvoices'
import PaymentEntries from './pages/PaymentEntries'
import CustomerStatement from './pages/CustomerStatement'
import SupplierStatement from './pages/SupplierStatement'
import ARAging from './pages/ARAging'
import APAging from './pages/APAging'
import StockValuation from './pages/StockValuation'
import FiscalYearClose from './pages/FiscalYearClose'
import UserManagement from './pages/UserManagement'
import PrintSalesInvoice from './pages/PrintSalesInvoice'
import PrintPurchaseInvoice from './pages/PrintPurchaseInvoice'

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <p className="center-text">جارٍ التحميل...</p>
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/accounts" replace />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="journal-entries" element={<JournalEntries />} />
        <Route path="customers" element={<Customers />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="items" element={<Items />} />
        <Route path="sales-invoices" element={<SalesInvoices />} />
        <Route path="purchase-invoices" element={<PurchaseInvoices />} />
        <Route path="payment-entries" element={<PaymentEntries />} />
        <Route path="reports/general-ledger" element={<GeneralLedger />} />
        <Route path="reports/trial-balance" element={<TrialBalance />} />
        <Route path="reports/profit-and-loss" element={<ProfitAndLoss />} />
        <Route path="reports/balance-sheet" element={<BalanceSheet />} />
        <Route path="reports/customer-statement" element={<CustomerStatement />} />
        <Route path="reports/supplier-statement" element={<SupplierStatement />} />
        <Route path="reports/ar-aging" element={<ARAging />} />
        <Route path="reports/ap-aging" element={<APAging />} />
        <Route path="reports/stock-valuation" element={<StockValuation />} />
        <Route path="fiscal-year-close" element={<FiscalYearClose />} />
        <Route path="users" element={<UserManagement />} />
      </Route>
      <Route
        path="print/sales-invoice/:id"
        element={
          <RequireAuth>
            <PrintSalesInvoice />
          </RequireAuth>
        }
      />
      <Route
        path="print/purchase-invoice/:id"
        element={
          <RequireAuth>
            <PrintPurchaseInvoice />
          </RequireAuth>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  )
}
