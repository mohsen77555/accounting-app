export type RootType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense'
export type JournalEntryStatus = 'Draft' | 'Submitted' | 'Cancelled'

export interface Account {
  id: string
  code: string
  name: string
  parent_id: string | null
  root_type: RootType
  account_type: string | null
  is_group: boolean
  is_frozen: boolean
  currency: string
}

export interface JournalEntry {
  id: string
  entry_number: string
  posting_date: string
  reference: string | null
  remarks: string | null
  status: JournalEntryStatus
  total_debit: number
  total_credit: number
  reversal_of: string | null
  created_at: string
}

export interface JournalEntryLine {
  id: string
  journal_entry_id: string
  line_no: number
  account_id: string
  debit: number
  credit: number
  description: string | null
}

export interface TrialBalanceRow {
  account_id: string
  account_code: string
  account_name: string
  opening_balance: number
  debit: number
  credit: number
  closing_balance: number
}

export interface GeneralLedgerRow {
  posting_date: string
  entry_number: string
  remarks: string | null
  debit: number
  credit: number
  running_balance: number
}

export interface ProfitAndLossRow {
  root_type: RootType
  account_code: string
  account_name: string
  amount: number
}

export interface BalanceSheetRow {
  root_type: RootType
  account_code: string
  account_name: string
  balance: number
}

export interface Customer {
  id: string
  code: string
  name: string
  email: string | null
  phone: string | null
  receivable_account_id: string
  is_disabled: boolean
}

export interface Supplier {
  id: string
  code: string
  name: string
  email: string | null
  phone: string | null
  payable_account_id: string
  is_disabled: boolean
}

export interface Item {
  id: string
  code: string
  name: string
  is_stock_item: boolean
  valuation_rate: number
  qty_on_hand: number
  inventory_account_id: string | null
  income_account_id: string | null
  cogs_account_id: string | null
  expense_account_id: string | null
  is_disabled: boolean
}

export interface SalesInvoice {
  id: string
  invoice_number: string
  customer_id: string
  posting_date: string
  due_date: string | null
  status: JournalEntryStatus
  total_amount: number
  outstanding_amount: number
  remarks: string | null
}

export interface PurchaseInvoice {
  id: string
  invoice_number: string
  supplier_id: string
  posting_date: string
  due_date: string | null
  status: JournalEntryStatus
  total_amount: number
  outstanding_amount: number
  remarks: string | null
}

export type PaymentType = 'Receive' | 'Pay'
export type PartyType = 'Customer' | 'Supplier'

export interface PaymentEntry {
  id: string
  entry_number: string
  payment_type: PaymentType
  party_type: PartyType
  party_id: string
  bank_account_id: string
  posting_date: string
  amount: number
  status: JournalEntryStatus
  remarks: string | null
}

export interface AgingRow {
  customer_id?: string
  customer_name?: string
  supplier_id?: string
  supplier_name?: string
  invoice_number: string
  posting_date: string
  due_date: string | null
  outstanding_amount: number
  days_overdue: number
  bucket: string
}

export interface StockValuationRow {
  item_code: string
  item_name: string
  qty_on_hand: number
  valuation_rate: number
  stock_value: number
}

export interface FiscalYear {
  id: string
  year_name: string
  start_date: string
  end_date: string
  is_closed: boolean
}
