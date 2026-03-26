export interface SmartLabelResponse {
  data: Data
  warning: string
}

export interface Data {
  current_page: number
  data: SmartLabelItem[]
  first_page_url: string
  from: number
  last_page: number
  last_page_url: string
  links: Link[]
  next_page_url: any
  path: string
  per_page: number
  prev_page_url: any
  to: number
  total: number
}

export interface SmartLabelItem {
  id: number
  company_url: string
  company_name: string
  brand: string
  brand_slug: string
  subbrand: string
  subbrand_slug: string
  common: string
  stripped_common: any
  upc: string
  url: string
  date_uploaded: string
  upc_e: any
  category: any
  custom_1: any
  custom_2: any
  deleted_at: any
  created_at: string
  updated_at: string
}

export interface Link {
  url?: string
  label: string
  active: boolean
}
