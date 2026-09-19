import { useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { PageHeader, EmptyState, LoadingState } from '../components/common/Ui'
import { useAuth } from '../context/AuthContext'
import { supabase as configuredSupabase } from '../services/supabase'

const supabase = configuredSupabase as any

export function NotificationsPage() {
  const auth = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const load = async () => {
    if (!supabase || !auth.profile) { setLoading(false); return }
    const result = await supabase.from('notifications').select('*').eq('recipient_id', auth.profile.id).order('created_at', { ascending: false }).range(0, 49)
    setItems(result.data ?? []); setLoading(false)
  }
  useEffect(() => { void load() }, [auth.profile?.id])
  const markRead = async (id: string) => { if (!supabase) return; await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id); setItems((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item)) }
  const markAllRead = async () => { if (!supabase || !auth.profile) return; await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('recipient_id', auth.profile.id).eq('is_read', false); setItems((current) => current.map((item) => ({ ...item, is_read: true }))) }
  return <><PageHeader eyebrow="Workspace updates" title="Notifications" description="Review status changes and actions relevant to your account." action={<button className="button button-ghost" onClick={() => void markAllRead()}><CheckCheck size={16} /> Mark all as read</button>} />{loading ? <LoadingState /> : items.length === 0 ? <div className="module-panel"><EmptyState icon={Bell} title="No notifications" description="Important workflow updates will appear here." /></div> : <section className="notification-list">{items.map((item) => <article className={`notification-item ${item.is_read ? 'notification-read' : 'notification-unread'}`} key={item.id}><div><Bell size={17} /><div><h3>{item.title}</h3><p>{item.message}</p><small>{new Date(item.created_at).toLocaleString()}</small></div></div>{!item.is_read && <button className="button button-ghost button-small" onClick={() => void markRead(item.id)}>Mark read</button>}</article>)}</section>}</>
}
