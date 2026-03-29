import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function htmlPage(title: string, message: string, success: boolean): string {
  const color = success ? '#16a34a' : '#dc2626'
  const icon = success ? '✓' : '✕'
  return `<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#f5f5f5; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { background:#fff; border-radius:16px; padding:48px; max-width:440px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.1); }
    .icon { width:64px; height:64px; border-radius:50%; background:${color}; color:#fff; font-size:32px; display:flex; align-items:center; justify-content:center; margin:0 auto 24px; }
    h1 { margin:0 0 12px; font-size:22px; color:#111; }
    p { margin:0; color:#666; font-size:15px; line-height:1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`
}

export const handler: Handler = async (event) => {
  const token = event.queryStringParameters?.token

  if (!token) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: htmlPage('Virhe', 'Peruutustunniste puuttuu.', false),
    }
  }

  // Hae ilmoittautuminen tokenilla
  const { data: reg, error: fetchError } = await supabase
    .from('registrations')
    .select('id, status, first_name')
    .eq('cancellation_token', token)
    .single()

  if (fetchError || !reg) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: htmlPage('Ei löytynyt', 'Ilmoittautumista ei löytynyt tai linkki on vanhentunut.', false),
    }
  }

  if (reg.status === 'cancelled') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: htmlPage('Jo peruutettu', `${reg.first_name}, ilmoittautumisesi on jo peruutettu aiemmin.`, true),
    }
  }

  // Peruuta
  const { error: updateError } = await supabase
    .from('registrations')
    .update({ status: 'cancelled' })
    .eq('id', reg.id)

  if (updateError) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: htmlPage('Virhe', 'Peruutus epäonnistui. Yritä myöhemmin uudelleen.', false),
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: htmlPage(
      'Ilmoittautuminen peruutettu',
      `${reg.first_name}, ilmoittautumisesi on peruutettu onnistuneesti. Voit sulkea tämän sivun.`,
      true
    ),
  }
}
