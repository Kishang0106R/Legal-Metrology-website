import { supabase } from './supabase'

export async function recordAudit(action: string, entityType: string, entityId?: string, oldData?: unknown, newData?: unknown) {
  if (!supabase) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('audit_logs').insert({ user_id: user.id, action, entity_type: entityType, entity_id: entityId ?? null, old_data: oldData ?? null, new_data: newData ?? null })
}
