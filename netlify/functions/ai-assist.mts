import Anthropic from '@anthropic-ai/sdk'
import type { Handler } from '@netlify/functions'

const client = new Anthropic()

const today = new Date().toISOString().split('T')[0]

const SYSTEM_PROMPTS: Record<string, string> = {
  categories_teams: `Olet avustaja joka luo vapaaehtoistapahtumien hallintajärjestelmään sisältöä.
Vastaa AINA pelkällä validilla JSON-objektilla ilman muuta tekstiä, selityksiä tai markdown-muotoilua.

Generoi käyttäjän pyynnön perusteella kategorioita ja tiimejä tapahtumalle.
Kategoriat ovat tehtäväluokkia kuten "Lipunmyynti", "Järjestyksenvalvonta", "Ruokailu", "Opastus".
Tiimit ovat vapaaehtoisryhmiä kuten "A-tiimi", "Iltavuoro", tai joukkueiden nimiä turnauksissa.

Vastaa täsmälleen tässä JSON-muodossa:
{"type":"categories_teams","categories":["Kategoria1","Kategoria2"],"teams":["Tiimi1","Tiimi2"]}`,

  events: `Olet avustaja joka luo vapaaehtoistapahtumien hallintajärjestelmään sisältöä.
Vastaa AINA pelkällä validilla JSON-objektilla ilman muuta tekstiä, selityksiä tai markdown-muotoilua.
Tänään on ${today}.

Generoi käyttäjän pyynnön perusteella tapahtumia. Käytä suomenkielistä kuvausta.
Päivämäärät muodossa "YYYY-MM-DD". Jos käyttäjä ei mainitse vuotta, käytä tulevaa vuotta.

Vastaa täsmälleen tässä JSON-muodossa:
{"type":"events","events":[{"name":"Nimi","description":"Kuvaus","location":"Sijainti","start_date":"YYYY-MM-DD","end_date":"YYYY-MM-DD"}]}`,

  tasks: `Olet avustaja joka luo vapaaehtoistapahtumien hallintajärjestelmään sisältöä.
Vastaa AINA pelkällä validilla JSON-objektilla ilman muuta tekstiä, selityksiä tai markdown-muotoilua.

Generoi käyttäjän pyynnön perusteella tehtäviä tapahtumaan. Tehtävät ovat globaaleja vapaaehtoistehtäviä kuten "Lipunmyynti", "Järjestyksenvalvonta", "Opastus".
Tehtävät eivät ole sidottu joukkueeseen – joukkuesidonnan tekee vuorot erikseen.
Kenttä "category": tehtävän kategoria (voi olla null).

Vastaa täsmälleen tässä JSON-muodossa:
{"type":"tasks","tasks":[{"name":"Tehtävän nimi","description":"Kuvaus","category":null,"min_age":null,"requires_pelinohjauskoulutus":false,"requires_ea1":false,"requires_ajokortti":false,"requires_jarjestyksenvalvontakortti":false}]}`,

  shifts: `Olet avustaja joka luo vapaaehtoistapahtumien hallintajärjestelmään sisältöä.
Vastaa AINA pelkällä validilla JSON-objektilla ilman muuta tekstiä, selityksiä tai markdown-muotoilua.
Tänään on ${today}.

Generoi käyttäjän pyynnön perusteella vuoroja tehtävään. Vuorot ovat ajanjaksoja joihin vapaaehtoinen ilmoittautuu.
Aikaleimät muodossa "YYYY-MM-DDTHH:MM:SS". Käytä tapahtuman päivämääriä jos annettu.

Vastaa täsmälleen tässä JSON-muodossa:
{"type":"shifts","shifts":[{"start_time":"YYYY-MM-DDTHH:MM:SS","end_time":"YYYY-MM-DDTHH:MM:SS","max_participants":5,"location":null,"notes":null}]}`,
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { prompt, context, eventId, taskId, eventStartDate, eventEndDate, availableCategories, availableTeams } = JSON.parse(event.body ?? '{}')

    if (!prompt || !context) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'prompt ja context vaaditaan' }),
      }
    }

    const systemPrompt = SYSTEM_PROMPTS[context]
    if (!systemPrompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Tuntematon context' }),
      }
    }

    // Lisää kontekstitieto promptiin jos annettu
    let fullPrompt = prompt
    if (eventId) fullPrompt = `[Tapahtuma ID: ${eventId}]\n${fullPrompt}`
    if (taskId) fullPrompt = `[Tehtävä ID: ${taskId}]\n${fullPrompt}`
    if (eventStartDate && eventEndDate) fullPrompt = `[Tapahtuman päivät: ${eventStartDate} – ${eventEndDate}]\n${fullPrompt}`
    else if (eventStartDate) fullPrompt = `[Tapahtuman aloituspäivä: ${eventStartDate}]\n${fullPrompt}`
    if (availableCategories) fullPrompt = `[Sallitut kategoriat (käytä VAIN näitä, älä keksi uusia): ${availableCategories}]\n${fullPrompt}`
    if (availableTeams) fullPrompt = `[Sallitut tiimit (käytä VAIN näitä, älä keksi uusia): ${availableTeams}]\n${fullPrompt}`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: fullPrompt }],
    })

    const text = (message.content[0] as { type: 'text'; text: string }).text

    // Suojattu JSON-parsinta: etsitään ensimmäinen {...} jos AI lisäisi muuta tekstiä
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'AI ei palauttanut kelvollista JSONia' }),
      }
    }

    const result = JSON.parse(match[0])

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result }),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tuntematon virhe'
    return {
      statusCode: 500,
      body: JSON.stringify({ error: message }),
    }
  }
}
