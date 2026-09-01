import { extraheerEisenBlok, keywordsUitTekst, vindVaardigheden } from "./extract";

export type AdviesVak = {
  id: string;
  titel: string;
  toon: "schoonmaak" | "match" | "advies" | "let-op";
  punten: string[];
};

export type AnalyseResultaat = {
  matchScore: number;
  vacatureSamenvatting: string;
  gevondenVaardighedenVacature: string[];
  gevondenVaardighedenCv: string[];
  ontbrekendeVaardigheden: string[];
  aanwezigeVaardigheden: string[];
  vakken: AdviesVak[];
  principes: string[];
};

function heeft(tekst: string, ...needles: string[]) {
  const t = tekst.toLowerCase();
  return needles.some((n) => t.includes(n.toLowerCase()));
}

function regels(tekst: string) {
  return tekst.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

export function analyseer(vacatureTekst: string, cvTekst: string, vacatureTitel: string): AnalyseResultaat {
  const vac = vacatureTekst || "";
  const cv = cvTekst || "";
  const eisen = extraheerEisenBlok(vac);
  const vacSkills = vindVaardigheden(vac + " " + eisen);
  const cvSkills = vindVaardigheden(cv);
  const aanwezige = vacSkills.filter((s) => cv.toLowerCase().includes(s));
  const ontbrekende = vacSkills.filter((s) => !cv.toLowerCase().includes(s));

  const vacKw = keywordsUitTekst(eisen + " " + vacatureTitel);
  const overlapKw = vacKw.filter((k) => cv.toLowerCase().includes(k)).length;
  const skillScore = vacSkills.length
    ? Math.round((aanwezige.length / vacSkills.length) * 70)
    : 35;
  const kwScore = vacKw.length ? Math.round((overlapKw / Math.min(vacKw.length, 20)) * 30) : 15;
  const matchScore = Math.max(8, Math.min(96, skillScore + kwScore));

  const schoonmaak: string[] = [];
  const match: string[] = [];
  const advies: string[] = [];
  const letOp: string[] = [];

  const cvRegels = regels(cv);
  if (cvRegels.length < 8) {
    schoonmaak.push("Het CV is erg kort of de tekst is slecht uitgelezen. Controleer of het bestand tekst bevat (geen scan-only PDF).");
  }

  const email = cv.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const tel = cv.match(/(\+31|0)[\s-]?\d{1,3}[\s-]?\d{3}[\s-]?\d{3,4}/);
  if (!email) schoonmaak.push("Er staat geen e-mailadres in de uitgelezen tekst. Zet contactgegevens bovenaan, in platte tekst (niet alleen in een koptekst-afbeelding).");
  if (!tel) advies.push("Overweeg een telefoonnummer toe te voegen als je dat wilt delen — recruiters bellen vaak sneller dan ze mailen.");

  if (heeft(cv, "lorem ipsum", "placeholder", "TODO", "xxx")) {
    schoonmaak.push("Er staan placeholder-teksten in het CV. Haal die weg.");
  }

  const spaties = (cv.match(/ {2,}/g) || []).length;
  if (spaties > 20) schoonmaak.push("Veel dubbele spaties of slordige uitlijning. Maak de spatiëring consistent.");

  const regelsMetTab = cv.split("\n").filter((l) => l.includes("\t")).length;
  if (regelsMetTab > 8) schoonmaak.push("Tab-tekens maken een CV in ATS-systemen rommelig. Gebruik gewone spaties of een eenvoudige layout.");

  if (!heeft(cv, "ervaring", "werkervaring", "werkzaam", "experience")) {
    schoonmaak.push("Er is geen duidelijke sectie ‘Werkervaring’. Gebruik een vaste kop, daarna per baan: functie, organisatie, periode, 3–5 punten.");
  }
  if (!heeft(cv, "opleiding", "education", "mbo", "hbo", "wo", "universiteit", "havo", "vwo")) {
    advies.push("Een korte sectie Opleiding ontbreekt of is niet herkenbaar. Zet diploma, instelling en jaar — alleen wat je echt hebt.");
  }

  const bulletCount = (cv.match(/(^|\n)\s*[-•*]/g) || []).length;
  if (bulletCount < 3 && cv.length > 400) {
    schoonmaak.push("Werkervaring leest als lange alinea’s. Splits taken in korte opsommingen die met een werkwoord beginnen.");
  }

  if (heeft(cv, "ik ben een hardwerkende", "teamplayer", "out of the box", "passie voor", "motivated individual")) {
    schoonmaak.push("Haal clichés weg (‘hardwerkend’, ‘teamplayer’, ‘out of the box’). Vervang ze door concrete voorbeelden die al in je CV staan.");
  }

  const periodes = cv.match(/\b(19|20)\d{2}\b/g) || [];
  if (periodes.length < 2) {
    advies.push("Data (maand + jaar) bij banen en opleidingen maken het CV scanbaar. Vul periodes in die kloppen — verzin geen gaten dicht.");
  }

  if (cv.length > 9000) {
    schoonmaak.push("Het CV is aan de lange kant. Houd 1–2 pagina’s: schrap taken die niet relevant zijn voor déze vacature, zonder feiten te verzinnen.");
  }

  if (aanwezige.length) {
    match.push(
      `Deze termen uit de vacature staan al in je CV: ${aanwezige.slice(0, 12).join(", ")}. Zet de belangrijkste daarvan zichtbaar in het profiel of bij de recente baan — letterlijk, zoals de vacature ze schrijft.`
    );
  } else {
    match.push("Er is weinig letterlijke overlap tussen vacature-termen en je CV. Dat hoeft niet fataal te zijn, maar ATS-systemen zoeken vaak exacte woorden.");
  }

  if (ontbrekende.length) {
    match.push(
      `Deze vacature-termen staan níet in je CV: ${ontbrekende.slice(0, 12).join(", ")}.`
    );
    advies.push(
      "Zet een ontbrekende term alleen in je CV als jij die vaardigheid of tool écht hebt gebruikt. Zo niet: laat hem weg. Liever een eerlijk gat dan een verzonnen skill."
    );
    advies.push(
      "Heb je wél ervaring met een ontbrekende term, maar onder een andere naam? Herschrijf de bestaande zin en gebruik het vacaturewoord. Voeg geen nieuwe baan of diploma toe."
    );
  }

  if (heeft(vac, "nederlands", "nederlandstalig") && !heeft(cv, "nederlands")) {
    advies.push("De vacature noemt Nederlands. Als dat je voertaal is, vermeld taalniveau (bijv. moedertaal) — geen extra diploma verzinnen.");
  }
  if (heeft(vac, "engels", "english") && !heeft(cv, "engels", "english")) {
    advies.push("De vacature noemt Engels. Alleen toevoegen met een niveau dat klopt (A2–C2 of ‘dagelijks gebruikt op het werk’).");
  }

  if (!heeft(cv, "profiel", "over mij", "samenvatting", "summary", "overzicht")) {
    advies.push(
      "Een profiel van 3–4 regels bovenaan helpt. Schrijf alleen wat uit de rest van je CV volgt: jaren, richting, belangrijkste tools. Geen nieuwe claims."
    );
  }

  letOp.push("Er wordt nooit werkervaring, een diploma, certificaat of resultaat verzonnen.");
  letOp.push("‘Opschonen’ betekent: slordigheden weg, formulering strakker, volgorde logischer, vacaturewoorden gebruiken als ze al waar zijn.");
  letOp.push("Suggesties om iets ‘toe te voegen’ zijn vragen aan jou — geen feiten die automatisch in het CV mogen.");

  if (!schoonmaak.length) {
    schoonmaak.push("Geen grove slordigheden gevonden in de uitgelezen tekst. Check zelf nog even koppen, datums en consistente functie-titels.");
  }

  const vacatureSamenvatting = vacatureTitel
    ? `Gescande vacature: ${vacatureTitel}. ${eisen.slice(0, 280)}${eisen.length > 280 ? "…" : ""}`
    : eisen.slice(0, 360);

  return {
    matchScore,
    vacatureSamenvatting,
    gevondenVaardighedenVacature: vacSkills,
    gevondenVaardighedenCv: cvSkills,
    ontbrekendeVaardigheden: ontbrekende,
    aanwezigeVaardigheden: aanwezige,
    vakken: [
      { id: "match", titel: "Match met de vacature", toon: "match", punten: match },
      {
        id: "aanwezig",
        titel: "Wat al goed staat",
        toon: "match",
        punten: aanwezige.length
          ? [
              `Zichtbaar in je CV: ${aanwezige.slice(0, 16).join(", ")}.`,
              "Zet de 3 belangrijkste daarvan in de eerste 8 regels (profiel of laatste baan), in dezelfde spelling als de vacature.",
            ]
          : ["We vonden weinig letterlijke vacaturewoorden. Dat kan nog — check of je dezelfde dingen anders noemt."],
      },
      { id: "schoon", titel: "CV opschonen", toon: "schoonmaak", punten: schoonmaak },
      {
        id: "formuliering",
        titel: "Formulering (alleen bestaande zinnen)",
        toon: "schoonmaak",
        punten: [
          "Begin opsommingen met een werkwoord: ‘beheerde’, ‘bouwde’, ‘begeleidde’ — zonder nieuwe resultaten te verzinnen.",
          "Vervang vage woorden (‘diverse werkzaamheden’) door de concrete taak die er al onder hangt.",
          "Eén idee per regel. Geen nieuwe cijfers tenzij die al in het CV staan.",
        ],
      },
      {
        id: "ontbreekt",
        titel: "Vacaturewoorden die ontbreken",
        toon: "advies",
        punten: ontbrekende.length
          ? [
              ontbrekende.slice(0, 16).join(", "),
              "Alleen overnemen als jij dit écht hebt gedaan. Zo niet: weglaten.",
            ]
          : ["Geen extra vacature-specifieke tools gedetecteerd naast wat al in je CV staat."],
      },
      { id: "toevoegen", titel: "Wat je eventueel kúnt toevoegen (alleen als het waar is)", toon: "advies", punten: advies },
      { id: "grenzen", titel: "Grenzen: geen verzonnen informatie", toon: "let-op", punten: letOp },
    ],
    principes: [
      "Geen verzonnen banen, diploma’s, cijfers of tools.",
      "Wel: schonere zinnen, vaste structuur, vacaturetaal voor bestaande ervaring.",
    ],
  };
}

export function schoonCv(cvTekst: string, vacatureTitel: string, aanwezige: string[]): string {
  const ruw = cvTekst.replace(/\u0000/g, "").replace(/\t/g, " ").replace(/[ ]{2,}/g, " ");
  const regelsIn = ruw.split(/\r?\n/).map((l) => l.trimEnd());

  const schoon: string[] = [];
  let leeg = 0;
  for (const l of regelsIn) {
    const t = l.trim();
    if (!t) {
      leeg += 1;
      if (leeg <= 1) schoon.push("");
      continue;
    }
    leeg = 0;
    if (/lorem ipsum|placeholder|\bxxx\b|\btodo\b/i.test(t)) continue;
    schoon.push(t.replace(/\s{2,}/g, " "));
  }

  const header = [
    "CV — opgeschoonde versie (geen nieuwe feiten toegevoegd)",
    vacatureTitel ? `Gericht op: ${vacatureTitel}` : "",
    aanwezige.length
      ? `Reeds aanwezige vacaturetermen die je zichtbaar mag houden: ${aanwezige.slice(0, 15).join(", ")}`
      : "",
    "—",
    "",
  ].filter((x) => x !== "");

  return [...header, ...schoon].join("\n").trim() + "\n";
}
