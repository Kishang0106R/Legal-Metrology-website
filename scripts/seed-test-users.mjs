import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.TEST_USER_PASSWORD
const emailOverrides = {
  super_admin: process.env.TEST_SUPER_ADMIN_EMAIL,
  controller: process.env.TEST_CONTROLLER_EMAIL,
  inspector: process.env.TEST_INSPECTOR_EMAIL,
  laboratory_user: process.env.TEST_LAB_EMAIL,
  manufacturer: process.env.TEST_MANUFACTURER_EMAIL,
}

if (!url || !serviceRoleKey || !password) {
  console.error('Set VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and TEST_USER_PASSWORD before running this script.')
  process.exit(1)
}

const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
const demoUsers = [
  { email: emailOverrides.super_admin ?? 'test.superadmin@legalmetrology.local', fullName: 'Test Super Admin', role: 'super_admin', userType: 'government' },
  { email: emailOverrides.controller ?? 'test.controller@legalmetrology.local', fullName: 'Test Controller', role: 'controller', userType: 'government' },
  { email: emailOverrides.inspector ?? 'test.inspector@legalmetrology.local', fullName: 'Test Inspector', role: 'inspector', userType: 'government' },
  { email: emailOverrides.laboratory_user ?? 'test.laboratory@legalmetrology.local', fullName: 'Test Laboratory User', role: 'laboratory_user', userType: 'government' },
  { email: emailOverrides.manufacturer ?? 'test.manufacturer@legalmetrology.local', fullName: 'Test Manufacturer', role: 'manufacturer', userType: 'business' },
]

async function findOrCreateUser(email, fullName, userType) {
  let page = 1
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    const existing = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (existing) return existing
    if (data.users.length < 100) break
    page += 1
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName, user_type: userType, is_demo: true } })
  if (error) throw error
  return data.user
}

async function main() {
  const { data: office, error: officeError } = await admin.from('offices').upsert({ office_code: 'DEMO-HQ', office_name: 'Demo Legal Metrology Office', office_type: 'controller_office', state: 'Demo State', district: 'Demo District', status: 'active', is_demo: true }, { onConflict: 'office_code' }).select('id').single()
  if (officeError) throw officeError

  const { data: business, error: businessError } = await admin.from('businesses').upsert({ business_code: 'DEMO-BUS-001', legal_name: 'Demo Manufacturing Co.', business_type: 'manufacturer', registration_number: 'DEMO-REG-001', state: 'Demo State', district: 'Demo District', status: 'active', is_demo: true }, { onConflict: 'business_code' }).select('id').single()
  if (businessError) throw businessError

  for (const account of demoUsers) {
    const user = await findOrCreateUser(account.email, account.fullName, account.userType)
    const profile = { auth_user_id: user.id, full_name: account.fullName, email: account.email, user_type: account.userType, role: account.role, office_id: account.userType === 'government' ? office.id : null, business_id: account.userType === 'business' ? business.id : null, status: 'active', is_demo: true }
    const { error } = await admin.from('profiles').upsert(profile, { onConflict: 'auth_user_id' })
    if (error) throw error
    console.log(`Seeded ${account.role}: ${account.email}`)
  }

  console.log('Test users are ready. All accounts use the TEST_USER_PASSWORD value and are marked via Auth metadata is_demo=true.')
}

main().catch((error) => { console.error(error.message ?? error); process.exit(1) })
