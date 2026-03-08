import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-3">
            <ArrowLeft size={18} />
            Takaisin
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Tietosuojaseloste</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="card p-8 prose prose-gray max-w-none">
          <p className="text-gray-500 text-sm mb-6">Päivitetty: {new Date().toLocaleDateString('fi-FI')}</p>

          <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Rekisterinpitäjä</h2>
          <p className="text-gray-600 mb-6">
            [Organisaation nimi]<br />
            [Osoite]<br />
            [Sähköposti]
          </p>

          <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Kerättävät tiedot</h2>
          <p className="text-gray-600 mb-4">
            Ilmoittautumisen yhteydessä keräämme seuraavat tiedot:
          </p>
          <ul className="list-disc pl-5 text-gray-600 mb-6 space-y-1">
            <li>Etu- ja sukunimi</li>
            <li>Sähköpostiosoite</li>
            <li>Puhelinnumero</li>
            <li>Alle 13-vuotiaiden osalta huoltajan puhelinnumero</li>
            <li>Pätevyystiedot (ajokortti, tieturva, hygieniapassi)</li>
            <li>Vapaaehtoisesti annetut lisätiedot</li>
          </ul>

          <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Tietojen käyttötarkoitus</h2>
          <p className="text-gray-600 mb-6">
            Kerättyjä tietoja käytetään ainoastaan vapaaehtoistapahtuman vuorovarausten hallintaan,
            yhteydenpitoon ilmoittautuneiden kanssa sekä tapahtuman järjestämiseen liittyviin tehtäviin.
          </p>

          <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Tietojen säilytys</h2>
          <p className="text-gray-600 mb-6">
            Henkilötietoja säilytetään tapahtuman ajan ja poistetaan [X kuukautta] tapahtuman jälkeen.
            Tietoja ei luovuteta kolmansille osapuolille ilman erillistä suostumusta.
          </p>

          <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Rekisteröidyn oikeudet</h2>
          <p className="text-gray-600 mb-4">Sinulla on oikeus:</p>
          <ul className="list-disc pl-5 text-gray-600 mb-6 space-y-1">
            <li>Tarkistaa itseäsi koskevat tiedot</li>
            <li>Pyytää tietojen korjaamista tai poistamista</li>
            <li>Peruuttaa suostumuksesi milloin tahansa</li>
          </ul>
          <p className="text-gray-600 mb-6">
            Tietopyyntöjä varten ota yhteyttä: [sähköposti]
          </p>

          <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Tietoturva</h2>
          <p className="text-gray-600">
            Tiedot tallennetaan suojatulle palvelimelle. Pääsy tietoihin on rajattu ainoastaan
            tapahtuman järjestäjille.
          </p>
        </div>
      </main>
    </div>
  )
}
