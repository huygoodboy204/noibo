import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const now = new Date()
  const nowUTC = new Date(now.toISOString().slice(0, 16)) // bỏ giây, ms

  // Lấy các event sắp diễn ra trong 2 ngày tới
  const { data: events, error } = await supabase
    .from('company_events')
    .select('*')
    .gte('start_time', new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString())
    .lte('start_time', new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString())

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }

  let notificationsCreated = 0

  for (const event of events ?? []) {
    const eventDate = new Date(event.start_time)

    // Reminder 1: 15h hôm trước
    const reminder1 = new Date(eventDate)
    reminder1.setDate(reminder1.getDate() - 1)
    reminder1.setHours(15, 0, 0, 0)

    // Reminder 2: 8h sáng ngày diễn ra
    const reminder2 = new Date(eventDate)
    reminder2.setHours(8, 0, 0, 0)

    // Reminder 3: 10 phút trước
    const reminder3 = new Date(eventDate.getTime() - 10 * 60 * 1000)

    const reminders = [
      { time: reminder1, message: 'Nhắc trước 1 ngày (15h hôm trước)' },
      { time: reminder2, message: 'Nhắc buổi sáng ngày diễn ra' },
      { time: reminder3, message: 'Nhắc trước 10 phút' }
    ]

    for (const userId of event.participants ?? []) {
      for (const r of reminders) {
        if (Math.abs(r.time.getTime() - nowUTC.getTime()) < 60 * 1000) {
          // Kiểm tra đã có notification chưa
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id_receiver', userId)
            .eq('related_entity_id', event.id)
            .eq('type', 'calendar_reminder')
            .eq('message', r.message)

          if (!existing || existing.length === 0) {
            await supabase.from('notifications').insert([{
              user_id_receiver: userId,
              title: event.title,
              message: r.message + `: ${event.title} lúc ${eventDate.toLocaleString()}`,
              type: 'calendar_reminder',
              related_entity_type: 'event',
              related_entity_id: event.id,
              created_by_id: event.created_by
            }])
            notificationsCreated++
          }
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, notificationsCreated }),
    { status: 200, headers: corsHeaders }
  )
}) 