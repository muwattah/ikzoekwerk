import type { AnalyseResultaat } from "./analyse";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function config() {
  const xai = process.env.XAI_API_KEY;
  if (xai) {
    return {
      key: xai,
      base: "https://api.x.ai/v1",
      model: process.env.XAI_MODEL || "grok-3-mini",
    };
  }
  const openai = process.env.OPENAI_API_KEY;
  if (openai) {
    return {
      key: openai,
      base: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    };
  }
  return null;
}

export function heeftLlm() {
  return !!config();
}

async function chat(messages: ChatMessage[]): Promise<string | null> {
  const cfg = config();
  if (!cfg) return null;
  const res = await fetch(`${cfg.base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.2,
      messages,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM-fout (${res.status}): ${err.slice(0, 400)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content || null;
}

const GRENZEN = `Je bent een Nederlandse CV-coach voor ikzoekwerk.
Harde regels:
- Verzin NOOIT werkervaring, werkgevers, diploma's, certificaten, cijfers, talen of tools die niet letterlijk of duidelijk in het CV staan.
- Je mag wél formuleringen strakker maken, koppen standaardiseren, opsommingen schoner zetten en vacaturewoorden gebruiken ALS die ervaring al in het CV staat.
- Als iets ontbreekt: formuleer het als suggestie/vraag ("Als je X hebt gedaan, vermeld het zo…"), nooit als feit.
- Antwoord in het Nederlands.`;

export async function verrijkAnalyse(
  basis: AnalyseResultaat,
  vacature: string,
  cv: string,
  titel: string
): Promise<AnalyseResultaat> {
  const raw = await chat([
    { role: "system", content: GRENZEN },
    {
      role: "user",
      content: `Vacaturetitel: ${titel}

Vacaturetekst:
${vacature.slice(0, 8000)}

CV-tekst:
${cv.slice(0, 8000)}

Geef JSON (geen markdown) met precies dit model:
{
  "vakken": [
    { "id": "match", "titel": "Match met de vacature", "punten": ["..."] },
    { "id": "schoon", "titel": "CV opschonen", "punten": ["..."] },
    { "id": "toevoegen", "titel": "Wat je eventueel kúnt toevoegen (alleen als het waar is)", "punten": ["..."] },
    { "id": "grenzen", "titel": "Grenzen: geen verzonnen informatie", "punten": ["..."] }
  ]
}
Elk vak 3 tot 6 korte, concrete punten. Geen verzonnen feiten.`,
    },
  ]);
  if (!raw) return basis;
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd < 0) return basis;
  try {
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as {
      vakken?: { id: string; titel: string; punten: string[] }[];
    };
    if (!parsed.vakken?.length) return basis;
    const toonVan = (id: string) =>
      id === "schoon" || id === "formuliering"
        ? "schoonmaak"
        : id === "toevoegen" || id === "ontbreekt"
          ? "advies"
          : id === "grenzen"
            ? "let-op"
            : "match";
    return {
      ...basis,
      vakken: parsed.vakken.map((v) => ({
        id: v.id,
        titel: v.titel,
        toon: toonVan(v.id) as AnalyseResultaat["vakken"][number]["toon"],
        punten: (v.punten || []).slice(0, 8),
      })),
    };
  } catch {
    return basis;
  }
}

export async function herschrijfCv(cv: string, vacature: string, titel: string): Promise<string | null> {
  return chat([
    { role: "system", content: GRENZEN },
    {
      role: "user",
      content: `Herschrijf dit CV schoner en beter leesbaar voor de vacature "${titel}".
Behoud alle feiten. Voeg niets toe dat niet in het CV staat.
Geen brief, geen leugens, geen "dummy" resultaten.
Structuur:
1. Naam / contact (alleen wat erin staat)
2. Profiel (3-4 regels, alleen afgeleid van bestaande inhoud, eventueel met vacaturewoorden die al kloppen)
3. Werkervaring
4. Opleiding
5. Vaardigheden (alleen genoemde)
6. Overig dat al in het CV stond

Vacature (context, niet als bron van nieuwe feiten):
${vacature.slice(0, 5000)}

Origineel CV:
${cv.slice(0, 10000)}

Geef alleen de opgeschoonde CV-tekst, in het Nederlands.`,
    },
  ]);
}
