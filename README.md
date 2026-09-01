# ikzoekwerk

Vacaturelink erin. CV als **document** (geen link). Advies in aparte vakken. Daarna één knop die het CV schoonzet — **zonder verzonnen informatie**.

Repo: [github.com/muwattah/ikzoekwerk](https://github.com/muwattah/ikzoekwerk)

## Wat het doet

1. Je plakt een vacature-URL. De site haalt de tekst op (of je plakt de tekst zelf).
2. Je uploadt je CV als PDF, Word (`.docx`) of `.txt`.
3. Je krijgt aparte vakken:
   - match met de vacature
   - wat al goed staat
   - opschonen
   - formulering
   - ontbrekende vacaturewoorden
   - wat je *eventueel* mag toevoegen (alleen als het waar is)
   - harde grenzen
4. Knop **Verander het voor mij** maakt een schone versie van *bestaande* inhoud. Geen nieuwe banen, diploma’s, tools of cijfers.

Zonder API-sleutel werkt de regelgebaseerde scan. Met `XAI_API_KEY` of `OPENAI_API_KEY` wordt het advies scherper, maar dezelfde grens blijft gelden.

## Lokaal starten

```bash
npm install
cp .env.example .env.local   # optioneel
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

Next.js 14 · TypeScript · mammoth (DOCX) · unpdf (PDF) · cheerio (vacature-HTML)

## Privacy

Bestanden gaan naar de server die jij draait, alleen voor die request. Er is geen account en geen database.
