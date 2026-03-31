export type DeviceStatus = 'IN_STOCK' | 'SOLD' | 'RETURNED'
export type ContactType = 'CUSTOMER' | 'SUPPLIER'
export type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'IBAN'
export type InvoiceType = 'AF' | 'MF'

// ─── Table types (gerçek DB şemasına göre) ───────────────────

export interface Brand {
  id: string
  name: string
  created_at: string
}

export interface Model {
  id: string
  brand_id: string
  name: string
  created_at: string
}

export interface ModelVariant {
  id: string
  model_id: string
  color: string
  storage: string
  created_at: string
}

export interface Device {
  id: string
  variant_id: string
  supplier_id: string | null
  is_foreign: boolean
  is_dual_sim: boolean
  imei_1: string | null
  imei_2: string | null
  has_box: boolean
  has_invoice: boolean
  is_new: boolean
  warranty_months: number
  barcode: string | null
  purchase_price: number
  recommended_sale_price: number | null
  purchase_date: string
  status: DeviceStatus
  created_at: string
}

export interface DeviceExpense {
  id: string
  device_id: string
  expense_name: string
  amount: number
  expense_date: string
  created_at: string
}

export interface DevicePriceHistory {
  id: string
  device_id: string
  old_purchase_price: number | null
  new_purchase_price: number | null
  old_recommended_price: number | null
  new_recommended_price: number | null
  changed_at: string
}

export interface Accessory {
  id: string
  barcode: string
  brand: string | null
  category: string | null
  purchase_price: number
  sale_price: number
  stock_quantity: number
  created_at: string
}

export interface AccessoryHistory {
  id: string
  accessory_id: string
  old_purchase_price: number | null
  new_purchase_price: number | null
  old_sale_price: number | null
  new_sale_price: number | null
  old_stock: number | null
  new_stock: number | null
  changed_at: string
}

export interface Contact {
  id: string
  full_name: string
  phone: string | null
  contact_type: ContactType
  created_at: string
}

export interface Sale {
  id: string
  device_id: string | null
  customer_id: string | null
  sale_price: number
  sale_date: string
  payment_method: PaymentMethod | null
  invoice_type: InvoiceType | null
  af_status: string | null
  created_at: string
}

// ─── View types (gerçek view kolonlarına göre) ────────────────

export interface InStockDevice {
  device_id: string
  brand: string
  model: string
  color: string
  storage: string
  imei_1: string | null
  is_new: boolean
  is_foreign: boolean
  purchase_price: number
  total_expenses: number
  net_cost_to_us: number
  recommended_sale_price: number | null
}

export interface MonthlySalesProfit {
  sale_month: string
  total_devices_sold: number
  total_revenue: number
  total_cost: number
  net_profit: number
}

export interface LowStockAccessory {
  barcode: string
  brand: string | null
  category: string | null
  purchase_price: number
  sale_price: number
  stock_quantity: number
}

export interface ContactVolume {
  contact_id: string
  full_name: string
  contact_type: ContactType
  phone: string | null
  total_purchased_from: number
  total_sold_to: number
}

export interface Database {
  public: {
    Tables: {
      brands: { Row: Brand; Insert: Omit<Brand, 'id' | 'created_at'>; Update: Partial<Omit<Brand, 'id' | 'created_at'>> }
      models: { Row: Model; Insert: Omit<Model, 'id' | 'created_at'>; Update: Partial<Omit<Model, 'id' | 'created_at'>> }
      model_variants: { Row: ModelVariant; Insert: Omit<ModelVariant, 'id' | 'created_at'>; Update: Partial<Omit<ModelVariant, 'id' | 'created_at'>> }
      devices: { Row: Device; Insert: Omit<Device, 'id' | 'created_at'>; Update: Partial<Omit<Device, 'id' | 'created_at'>> }
      device_expenses: { Row: DeviceExpense; Insert: Omit<DeviceExpense, 'id' | 'created_at'>; Update: Partial<Omit<DeviceExpense, 'id' | 'created_at'>> }
      device_price_history: { Row: DevicePriceHistory; Insert: Omit<DevicePriceHistory, 'id' | 'changed_at'>; Update: Partial<Omit<DevicePriceHistory, 'id' | 'changed_at'>> }
      accessories: { Row: Accessory; Insert: Omit<Accessory, 'id' | 'created_at'>; Update: Partial<Omit<Accessory, 'id' | 'created_at'>> }
      accessory_history: { Row: AccessoryHistory; Insert: Omit<AccessoryHistory, 'id' | 'changed_at'>; Update: Partial<Omit<AccessoryHistory, 'id' | 'changed_at'>> }
      contacts: { Row: Contact; Insert: Omit<Contact, 'id' | 'created_at'>; Update: Partial<Omit<Contact, 'id' | 'created_at'>> }
      sales: { Row: Sale; Insert: Omit<Sale, 'id' | 'created_at'>; Update: Partial<Omit<Sale, 'id' | 'created_at'>> }
    }
    Views: {
      v_in_stock_devices: { Row: InStockDevice }
      v_monthly_sales_profit: { Row: MonthlySalesProfit }
      v_low_stock_accessories: { Row: LowStockAccessory }
      v_contact_volumes: { Row: ContactVolume }
    }
    Functions: {
      sell_device: { Args: { p_device_id: string; p_customer_id: string | null; p_sale_price: number; p_payment_method: string | null; p_invoice_type: string | null }; Returns: string }
      sell_accessory: { Args: { p_accessory_barcode: string; p_quantity: number }; Returns: boolean }
      get_total_device_cost: { Args: { p_device_id: string }; Returns: number }
      get_device_net_profit: { Args: { p_device_id: string }; Returns: number }
    }
  }
}
