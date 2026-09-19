export type UserType = 'government' | 'business'
export type Role = 'super_admin' | 'controller' | 'assistant_controller' | 'inspector' | 'clerk' | 'laboratory_user' | 'manufacturer' | 'packer' | 'importer' | 'dealer' | 'retailer'
export type ProfileStatus = 'pending' | 'active' | 'inactive' | 'suspended'

export type Profile = {
  id: string
  auth_user_id: string
  full_name: string
  email: string
  phone: string | null
  user_type: UserType
  role: Role
  office_id: string | null
  business_id: string | null
  status: ProfileStatus
  avatar_url: string | null
  is_demo?: boolean
  created_at: string
  updated_at: string
}

export const roleLabels: Record<Role, string> = {
  super_admin: 'Super Admin', controller: 'Controller', assistant_controller: 'Assistant Controller', inspector: 'Legal Metrology Inspector', clerk: 'Clerk / Office Staff', laboratory_user: 'Laboratory User', manufacturer: 'Manufacturer', packer: 'Packer', importer: 'Importer', dealer: 'Dealer', retailer: 'Retailer',
}

export const userTypeLabels: Record<UserType, string> = { government: 'Government', business: 'Business' }
