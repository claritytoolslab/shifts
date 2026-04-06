import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const brevoApiKey = process.env.BREVO_API_KEY ?? ''
const senderEmail = process.env.BREVO_SENDER_EMAIL ?? 'noreply@varauslista.fi'
const siteUrl = process.env.SITE_URL ?? process.env.URL ?? ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const formatter = new Intl.DateTimeFormat('fi-FI', {
    timeZone: 'Europe/Helsinki',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  const parts = formatter.formatToParts(d)
  const year = parts.find(p => p.type === 'year')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const day = parts.find(p => p.type === 'day')?.value
  const hour = parts.find(p => p.type === 'hour')?.value
  const minute = parts.find(p => p.type === 'minute')?.value
  return `${day}.${month}.${year} klo ${hour}:${minute}`
}

function formatDayName(dateStr: string): string {
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat('fi-FI', {
    timeZone: 'Europe/Helsinki',
    weekday: 'long',
  }).format(d)
}

function buildReminderHtml(data: {
  firstName: string
  eventName: string
  taskName: string
  shiftStart: string
  shiftEnd: string
  location: string | null
  shiftNotes: string | null
  taskDescription: string | null
  cancelUrl: string
}): string {
  const locationRow = data.location
    ? `<tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap;vertical-align:top;">Sijainti</td><td style="padding:6px 0;font-weight:600;">${data.location}</td></tr>`
    : ''

  const notesRow = data.shiftNotes
    ? `<tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap;vertical-align:top;">Lisätiedot</td><td style="padding:6px 0;font-weight:600;">${data.shiftNotes}</td></tr>`
    : ''

  const descriptionRow = data.taskDescription
    ? `<tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap;vertical-align:top;">Kuvaus</td><td style="padding:6px 0;">${data.taskDescription}</td></tr>`
    : ''

  const dayName = formatDayName(data.shiftStart)

  return `<!DOCTYPE html>
<html lang="fi">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#7c3aed;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;">Muistutus huomisesta vuorosta</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;font-size:16px;color:#333;">Hei ${data.firstName}!</p>
      <p style="margin:0 0 24px;color:#555;">Ystävällinen muistutus, että sinulla on huomenna ${dayName}na vuoro tapahtumassa <strong>${data.eventName}</strong>.</p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap;vertical-align:top;">Tehtävä</td><td style="padding:6px 0;font-weight:600;">${data.taskName}</td></tr>
        ${descriptionRow}
        <tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap;vertical-align:top;">Alkaa</td><td style="padding:6px 0;font-weight:600;">${data.shiftStart}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap;vertical-align:top;">Päättyy</td><td style="padding:6px 0;font-weight:600;">${data.shiftEnd}</td></tr>
        ${locationRow}
        ${notesRow}
      </table>

      <p style="margin:0 0 8px;font-size:14px;color:#92400e;">Jos et pääse paikalle, peruuta ilmoittautumisesi:</p>
      <p style="margin:0 0 24px;text-align:center;">
        <a href="${data.cancelUrl}" style="display:inline-block;padding:10px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">Peruuta ilmoittautuminen</a>
      </p>

      <p style="margin:0;font-size:13px;color:#999;">Tämä viesti on lähetetty automaattisesti. Älä vastaa tähän viestiin.</p>
    </div>
  </div>
</body>
</html>`
}

export const handler: Handler = async () => {
  try {
    // Hae vuorot jotka alkavat 23-25h päästä (tunnin ikkunalla ei duplikaatteja)
    const now = new Date()
    const from = new Date(now.getTime() + 23 * 60 * 60 * 1000)
    const to = new Date(now.getTime() + 25 * 60 * 60 * 1000)

    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')
      .gte('start_time', from.toISOString())
      .lte('start_time', to.toISOString())

    if (shiftsError || !shifts || shifts.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Ei muistutettavia vuoroja', count: 0 }),
      }
    }

    let sentCount = 0
    let errorCount = 0

    for (const shift of shifts) {
      const { data: task } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', shift.task_id)
        .single()

      if (!task) continue

      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', task.event_id)
        .single()

      if (!eventData || !eventData.is_active) continue

      const { data: registrations } = await supabase
        .from('registrations')
        .select('*')
        .eq('shift_id', shift.id)
        .eq('status', 'confirmed')

      if (!registrations || registrations.length === 0) continue

      const senderName = eventData.sender_name || 'Varauslista'

      for (const reg of registrations) {
        // Tarkista ettei muistutusta ole jo lähetetty
        const { data: existingReminder } = await supabase
          .from('email_queue')
          .select('id')
          .eq('registration_id', reg.id)
          .like('subject', 'Muistutus%')
          .limit(1)

        if (existingReminder && existingReminder.length > 0) continue

        const cancelUrl = `${siteUrl}/.netlify/functions/cancel-registration?token=${reg.cancellation_token}`
        const subject = `Muistutus: vuorosi huomenna – ${eventData.name}`

        const htmlBody = buildReminderHtml({
          firstName: reg.first_name,
          eventName: eventData.name,
          taskName: task.name,
          shiftStart: formatDate(shift.start_time),
          shiftEnd: formatDate(shift.end_time),
          location: shift.location,
          shiftNotes: shift.notes,
          taskDescription: task.description,
          cancelUrl,
        })

        let emailSent = false
        let errorMessage: string | null = null

        try {
          const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'content-type': 'application/json',
              'api-key': brevoApiKey,
            },
            body: JSON.stringify({
              sender: { name: senderName, email: senderEmail },
              to: [{ email: reg.email, name: `${reg.first_name} ${reg.last_name}` }],
              subject,
              htmlContent: htmlBody,
            }),
          })

          if (brevoRes.ok) {
            emailSent = true
            sentCount++
          } else {
            const errBody = await brevoRes.text()
            errorMessage = `Brevo ${brevoRes.status}: ${errBody}`
            errorCount++
          }
        } catch (err) {
          errorMessage = err instanceof Error ? err.message : 'Tuntematon virhe'
          errorCount++
        }

        await supabase.from('email_queue').insert({
          registration_id: reg.id,
          to_email: reg.email,
          subject,
          html_body: htmlBody,
          status: emailSent ? 'sent' : 'failed',
          error_message: errorMessage,
          attempts: 1,
          sent_at: emailSent ? new Date().toISOString() : null,
        })
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Muistutukset lähetetty', sent: sentCount, errors: errorCount }),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tuntematon virhe'
    return {
      statusCode: 500,
      body: JSON.stringify({ error: message }),
    }
  }
}
