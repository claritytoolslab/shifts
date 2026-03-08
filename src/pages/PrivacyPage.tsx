import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Event } from '../lib/database.types'

export default function PrivacyPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<Event | null>(null)

  useEffect(() => {
    if (eventId) {
      supabase
        .from('events')
        .select('id, name, privacy_contact, privacy_retention')
        .eq('id', eventId)
        .single()
        .then(({ data }) => {
          if (data) setEvent(data as Event)
        })
    }
  }, [eventId])

  const contactInfo = event?.privacy_contact || '[Tietoja ei ole vielä täytetty]'
  const retention = event?.privacy_retention || '[Ei määritelty]'
  const backTo = eventId ? `/event/${eventId}` : '/'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link to={backTo} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-3 text-sm">
            <ArrowLeft size={16} />
            {event?.name ?? 'Takaisin'}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Tietosuojaseloste</h1>
          {event?.name && (
            <p className="text-sm text-gray-500 mt-0.5">{event.name}</p>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="card p-6 md:p-8 space-y-6">
          <p className="text-gray-500 text-sm">Päivitetty: {new Date().toLocaleDateString('fi-FI')}</p>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">1. Rekisterinpitäjä</h2>
            <p className="text-gray-600 text-sm whitespace-pre-line">{contactInfo}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">2. Kerättävät tiedot</h2>
            <p className="text-gray-600 text-sm mb-2">Ilmoittautumisen yhteydessä keräämme:</p>
            <ul className="list-disc pl-5 text-gray-600 text-sm space-y-1">
              <li>Etu- ja sukunimi</li>
              <li>Sähköpostiosoite</li>
              <li>Puhelinnumero</li>
              <li>Alle 13-vuotiaiden osalta huoltajan puhelinnumero</li>
              <li>Pätevyystiedot (ajokortti, tieturva, hygieniapassi)</li>
              <li>Vapaaehtoisesti annetut lisätiedot</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">3. Käyttötarkoitus</h2>
            <p className="text-gray-600 text-sm">
              Tietoja käytetään ainoastaan vapaaehtoistoiminnan vuorovarausten hallintaan
              ja yhteydenpitoon ilmoittautuneiden kanssa.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">4. Säilytysaika</h2>
            <p className="text-gray-600 text-sm">
              Tietoja säilytetään {retention} tapahtuman jälkeen.
              Tietoja ei luovuteta kolmansille osapuolille.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">5. Rekisteröidyn oikeudet</h2>
            <ul className="list-disc pl-5 text-gray-600 text-sm space-y-1">
              <li>Tarkistaa itseäsi koskevat tiedot</li>
              <li>Pyytää tietojen korjaamista tai poistamista</li>
              <li>Peruuttaa suostumuksesi milloin tahansa</li>
            </ul>
            <p className="text-gray-600 text-sm mt-2">
              Pyyntöjä varten ota yhteyttä rekisterinpitäjään.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">6. Tietoturva</h2>
            <p className="text-gray-600 text-sm">
              Tiedot tallennetaan suojatulle palvelimelle. Pääsy on rajattu tapahtuman järjestäjille.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
