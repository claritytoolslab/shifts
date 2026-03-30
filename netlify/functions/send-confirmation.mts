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
  // Muotoile Europe/Helsinki aikavyöhykkeessä, jotta aika näytetään oikein riippumatta palvelimen aikavyöhykkeestä
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

function buildDefaultHtml(data: {
  firstName: string
  eventName: string
  taskName: string
  shiftStart: string
  shiftEnd: string
  location: string | null
  cancelUrl: string
  customMessage: string | null
}): string {
  const locationRow = data.location
    ? `<tr><td style="padding:6px 0;color:#666;">Sijainti</td><td style="padding:6px 0;font-weight:600;">${data.location}</td></tr>`
    : ''

  const customSection = data.customMessage
    ? `<div style="margin:24px 0;padding:16px;background:#f0f9ff;border-radius:8px;">${data.customMessage}</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="fi">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#2563eb;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;">Ilmoittautuminen vahvistettu</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;font-size:16px;color:#333;">Hei ${data.firstName}!</p>
      <p style="margin:0 0 24px;color:#555;">Ilmoittautumisesi tapahtumaan <strong>${data.eventName}</strong> on vahvistettu.</p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="padding:6px 0;color:#666;">Tehtävä</td><td style="padding:6px 0;font-weight:600;">${data.taskName}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Alkaa</td><td style="padding:6px 0;font-weight:600;">${data.shiftStart}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Päättyy</td><td style="padding:6px 0;font-weight:600;">${data.shiftEnd}</td></tr>
        ${locationRow}
      </table>

      ${customSection}

      <div style="margin:32px 0;padding:16px;background:#fef3c7;border-radius:8px;text-align:center;">
        <p style="margin:0 0 8px;font-size:14px;color:#92400e;">Jos et pääse paikalle, peruuta ilmoittautumisesi:</p>
        <a href="${data.cancelUrl}" style="display:inline-block;padding:10px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">Peruuta ilmoittautuminen</a>
      </div>

      <p style="margin:24px 0 0;font-size:13px;color:#999;">Tämä viesti on lähetetty automaattisesti. Älä vastaa tähän viestiin.</p>
    </div>
  </div>
</body>
</html>`
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { registrationId } = JSON.parse(event.body ?? '{}')

    if (!registrationId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'registrationId vaaditaan' }),
      }
    }

    // Hae registration + shift + task + event
    const { data: reg, error: regError } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', registrationId)
      .single()

    if (regError || !reg) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Ilmoittautumista ei löytynyt' }),
      }
    }

    const { data: shift } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', reg.shift_id)
      .single()

    if (!shift) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Vuoroa ei löytynyt' }),
      }
    }

    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', shift.task_id)
      .single()

    if (!task) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Tehtävää ei löytynyt' }),
      }
    }

    const { data: eventData } = await supabase
      .from('events')
      .select('*')
      .eq('id', task.event_id)
      .single()

    if (!eventData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Tapahtumaa ei löytynyt' }),
      }
    }

    const cancelUrl = `${siteUrl}/.netlify/functions/cancel-registration?token=${reg.cancellation_token}`
    const senderName = eventData.sender_name || 'Varauslista'
    const subject = eventData.confirmation_email_subject || `Ilmoittautumisesi on vahvistettu – ${eventData.name}`

    const htmlBody = buildDefaultHtml({
      firstName: reg.first_name,
      eventName: eventData.name,
      taskName: task.name,
      shiftStart: formatDate(shift.start_time),
      shiftEnd: formatDate(shift.end_time),
      location: shift.location,
      cancelUrl,
      customMessage: eventData.confirmation_email_body,
    })

    // Lähetä Brevolla
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
      } else {
        const errBody = await brevoRes.text()
        errorMessage = `Brevo ${brevoRes.status}: ${errBody}`
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Tuntematon virhe'
    }

    // Tallenna email_queue
    await supabase.from('email_queue').insert({
      registration_id: registrationId,
      to_email: reg.email,
      subject,
      html_body: htmlBody,
      status: emailSent ? 'sent' : 'failed',
      error_message: errorMessage,
      attempts: 1,
      sent_at: emailSent ? new Date().toISOString() : null,
    })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: emailSent, error: errorMessage }),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tuntematon virhe'
    return {
      statusCode: 500,
      body: JSON.stringify({ error: message }),
    }
  }
}
