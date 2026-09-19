import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const roles = new Set(['controller', 'assistant_controller', 'inspector', 'clerk', 'laboratory_user'])

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await admin.auth.getUser(token)
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: actor } = await admin.from('profiles').select('role,status').eq('auth_user_id', user.id).single()
    if (!actor || actor.status !== 'active' || actor.role !== 'super_admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const body = await request.json()
    if (!body.fullName || !body.email || !roles.has(body.role) || !body.officeId) return new Response(JSON.stringify({ error: 'Full name, email, role, and office are required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: office } = await admin.from('offices').select('id,status').eq('id', body.officeId).single()
    if (!office || office.status !== 'active') return new Response(JSON.stringify({ error: 'The selected office is not active.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(body.email, { data: { user_type: 'government' } })
    if (inviteError || !invited.user) throw inviteError ?? new Error('Invitation failed')
    const { data: profile, error: profileError } = await admin.from('profiles').insert({ auth_user_id: invited.user.id, full_name: body.fullName, email: body.email, phone: body.phone ?? null, user_type: 'government', role: body.role, office_id: body.officeId, status: body.status ?? 'pending' }).select().single()
    if (profileError) throw profileError
    await admin.from('audit_logs').insert({ user_id: user.id, action: 'officer_invited', entity_type: 'profile', entity_id: profile.id, new_data: profile })
    return new Response(JSON.stringify({ profile }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'The officer invitation could not be completed.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
